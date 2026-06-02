import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { resolveMailConfig } from '../utils/mail-config.util';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;
    private isConfigured = false;
    private mailFrom = '';
    private activeHost = '';

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        await this.initializeTransporter();
    }

    private resolveAppName(): string {
        const appNameFromConfig = this.configService.get<string>('app.name');
        const appNameEnv = process.env.APP_NAME;
        return appNameFromConfig || appNameEnv || 'Vilaire Valcin';
    }

    private async initializeTransporter() {
        const resolvedAppName = this.resolveAppName();
        const mailConfig = resolveMailConfig(resolvedAppName);

        if (!mailConfig) {
            this.logger.error(
                '[EMAIL] NOT configured — set MAIL_USERNAME and MAIL_PASSWORD (or EMAIL_USER / EMAIL_PASS) in server .env',
            );
            this.isConfigured = false;
            return;
        }

        this.mailFrom = `"${mailConfig.fromName}" <${mailConfig.from}>`;
        this.activeHost = mailConfig.host;

        this.logger.log(
            `[EMAIL] config host=${mailConfig.host} port=${mailConfig.port} secure=${mailConfig.secure} user=${mailConfig.user} from=${mailConfig.from} passLen=${mailConfig.pass.length}`,
        );

        if (mailConfig.from.toLowerCase() !== mailConfig.user.toLowerCase()) {
            this.logger.warn(
                `[EMAIL] MAIL_FROM_ADDRESS (${mailConfig.from}) differs from MAIL_USERNAME (${mailConfig.user})`,
            );
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: mailConfig.host,
                port: mailConfig.port,
                secure: mailConfig.secure,
                auth: {
                    user: mailConfig.user,
                    pass: mailConfig.pass,
                },
                requireTLS: mailConfig.requireTLS,
                tls: { rejectUnauthorized: false },
            });

            this.logger.log(`[EMAIL] verifying SMTP connection to ${mailConfig.host}...`);
            await this.transporter.verify();
            this.logger.log(`[EMAIL] READY — SMTP auth OK (${mailConfig.host})`);
            this.isConfigured = true;
        } catch (error: any) {
            this.logger.error(`[EMAIL] SMTP verify failed: ${error?.message ?? error}`);
            this.logger.error('🔍 Full error:', error);

            // Check for specific authentication errors
            if (error.message && error.message.includes('535')) {
                this.logger.error(
                    '[EMAIL] 535 auth failed — check MAIL_USERNAME/MAIL_PASSWORD on THIS server (PM2 .env). Gmail: use App Password, port 587 + MAIL_ENCRYPTION=tls',
                );
            }

            await this.tryZohoAlternatives({
                auth: { user: mailConfig.user, pass: mailConfig.pass },
                from: mailConfig.from,
            });
        }
    }

    private async tryZohoAlternatives(mailConfig: { auth: { user: string; pass: string }; from: string }) {
        this.logger.log('🔄 Trying alternative Zoho configurations...');

        const alternatives = [
            {
                name: 'Zoho with SSL',
                config: {
                    host: 'smtp.zoho.com',
                    port: 465,
                    secure: true,
                    auth: mailConfig.auth,
                    tls: { rejectUnauthorized: false }
                }
            },
            {
                name: 'Zoho with STARTTLS',
                config: {
                    host: 'smtp.zoho.com',
                    port: 587,
                    secure: false,
                    auth: mailConfig.auth,
                    requireTLS: true,
                    tls: { rejectUnauthorized: false }
                }
            },
            {
                name: 'Zoho Europe',
                config: {
                    host: 'smtp.zoho.eu',
                    port: 587,
                    secure: false,
                    auth: mailConfig.auth,
                    requireTLS: true,
                    tls: { rejectUnauthorized: false }
                }
            }
        ];

        for (const alt of alternatives) {
            try {
                this.logger.log(`   Trying: ${alt.name}...`);
                this.transporter = nodemailer.createTransport(alt.config);
                await this.transporter.verify();
                this.logger.log(`✅ Success with ${alt.name}!`);
                this.isConfigured = true;
                return;
            } catch (altError) {
                this.logger.log(`   ❌ ${alt.name} failed: ${altError.message}`);
                if (altError.message && altError.message.includes('535')) {
                    this.logger.log(`      → Authentication failed. Check your credentials.`);
                }
            }
        }

        this.logger.error('❌ All Zoho configurations failed');
        this.isConfigured = false;
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.isConfigured) {
            this.logger.error('❌ Email service not configured. Cannot send email.');
            return false;
        }

        const mailOptions = {
            from: this.mailFrom || undefined,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        };

        try {
            this.logger.log(`📧 Attempting to send email to: ${options.to}`);
            this.logger.log(`📝 Subject: ${options.subject}`);
            this.logger.log(`📨 From: ${this.mailFrom} via ${this.activeHost}`);

            const result = await this.transporter.sendMail(mailOptions);

            this.logger.log(`✅ Email sent successfully to ${options.to}`);
            this.logger.log(`📨 Message ID: ${result.messageId}`);
            this.logger.log(`📊 Response: ${result.response}`);

            return true;
        } catch (error) {
            this.logger.error(`❌ Failed to send email to ${options.to}`);
            this.logger.error(`🔍 Error details: ${error.message}`);
            this.logger.error(`⚡ Error code: ${error.code}`);

            if (error.response) {
                this.logger.error(`📨 SMTP Response: ${error.response}`);
            }

            return false;
        }
    }

    // Template for password reset email
    async sendPasswordResetEmail(email: string, token: string, userName: string = 'User'): Promise<boolean> {
        if (!this.isConfigured) {
            this.logger.warn('Email service not configured. Cannot send password reset email.');
            // For development, log the token so you can still test
            this.logger.log(`🔑 Password Reset Token for ${email}: ${token}`);
            return false;
        }

        const appName = this.resolveAppName();
        const subject = `Password Reset Code - ${appName}`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
        .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; margin: 30px 0; padding: 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; letter-spacing: 8px; font-family: monospace; }
        .warning { background: #fef3cd; border: 1px solid #fde047; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #4F46E5; margin: 0;">${appName}</h1>
            <h2 style="color: #6b7280; margin: 10px 0 0 0;">Password Reset Request</h2>
        </div>
        
        <p>Hello <strong>${userName}</strong>,</p>
        <p>You requested a password reset for your account. Use the verification code below to reset your password:</p>
        
        <div class="code">${token}</div>
        
        <p>This code will expire in <strong style="color: #dc2626;">15 minutes</strong>.</p>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and ensure your account is secure.
        </div>
        
        <p>Need help? Contact our support team for assistance.</p>
        
        <div class="footer">
            <p>This email was sent from ${appName}</p>
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Password Reset Code - ${appName}

Hello ${userName},

You requested a password reset for your account. Use the verification code below to reset your password:

Verification Code: ${token}

This code will expire in 15 minutes.

If you didn't request this password reset, please ignore this email.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
`;

        return this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    // Template for password reset success email
    async sendPasswordResetSuccessEmail(email: string, userName: string = 'User'): Promise<boolean> {
        if (!this.isConfigured) {
            this.logger.warn('Email service not configured. Cannot send success email.');
            return false;
        }

        const appName = this.resolveAppName();
        const subject = `Password Reset Successful - ${appName}`;

        const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="color: #10b981; font-size: 48px; margin-bottom: 20px;">✓</div>
        <h1 style="color: #10b981; margin: 0;">Password Reset Successful</h1>
    </div>
    
    <p>Hello <strong>${userName}</strong>,</p>
    
    <p>Your password has been successfully reset at ${this.formatDateTimeUTC(new Date())}.</p>
    
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong>🔒 Security Notice:</strong> For your security, all active sessions have been logged out.
    </div>
    
    <p>If you did not make this change, please contact our support team immediately.</p>
    
    <p>Thank you for helping us keep your account secure.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #6b7280; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
</div>`;

        return this.sendEmail({
            to: email,
            subject,
            html,
        });
    }

    // Check if email service is available
    isEmailServiceAvailable(): boolean {
        return this.isConfigured;
    }

    /**
     * Format date and time in UTC (MM/DD/YYYY, HH:MM AM/PM) to avoid timezone issues
     */
    private formatDateTimeUTC(date: any): string {
        if (!date) return 'N/A';
        try {
            const dateObj = new Date(date);
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            const year = dateObj.getUTCFullYear();
            
            // Format time in 12-hour format
            let hours = dateObj.getUTCHours();
            const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const hoursStr = String(hours).padStart(2, '0');
            
            return `${month}/${day}/${year}, ${hoursStr}:${minutes} ${ampm}`;
        } catch (e) {
            return 'N/A';
        }
    }
}