import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { PasswordResetRepository } from 'src/shared/repositories/password-reset.repository';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { EmailService } from 'src/common/services/email.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyResetCodeDto } from '../dto/verify-reset-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { NotificationType } from 'src/shared/schemas/notification.schema';
import { UserRole } from 'src/common/constants/user.constants';
import { UserDocument } from 'src/shared/schemas/user.schema';

export type PasswordResetAudience = { allowedRoles?: UserRole[] };

@Injectable()
export class PasswordResetService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordResetRepository: PasswordResetRepository,
        private readonly notificationService: NotificationService,
        private readonly emailService: EmailService,
        private readonly configService: ConfigService,
    ) { }

    async initiatePasswordReset(forgotPasswordDto: ForgotPasswordDto, audience?: PasswordResetAudience) {
        const { email } = forgotPasswordDto;

        // Validate email format
        if (!email || !this.isValidEmail(email)) {
            throw new BadRequestException('Please provide a valid email address');
        }

        // Check if user exists
        const user = await this.userRepository.findByEmail(email);
        if (!user || !this.userMatchesAudience(user, audience)) {
            // Don't reveal if user exists or not for security
            return {
                message: 'If the email exists, a reset code has been sent.'
            };
        }

        // Check if user is active
        if (user.status !== 'active') {
            throw new BadRequestException('Your account is not active. Please contact support.');
        }

        try {
            // Generate 4-digit token
            const token = this.generateResetToken();

            // Create reset token in database
            await this.passwordResetRepository.createResetToken(email, token);

            // Send email with reset code
            const emailSent = await this.emailService.sendPasswordResetEmail(
                email,
                token,
                `${user.firstName} ${user.lastName}`
            );

            // Check if email was sent successfully (EmailService returns boolean)
            if (!emailSent) {
                throw new InternalServerErrorException('Failed to send reset code email. Please try again.');
            }

            // Also send in-app notification
            await this.notificationService.createUserNotification({
                title: 'Password Reset Code',
                message: `A password reset code has been sent to your email. The code will expire in 15 minutes.`,
                type: NotificationType.SYSTEM,
                recipient: user._id.toString(),
                data: { token, expiresIn: '15 minutes' },
            });

            // Security: Only return debug token in development mode (never in production)
            // Check NODE_ENV directly to ensure we never expose tokens in production
            const nodeEnv = process.env.NODE_ENV;
            const isDevelopment = nodeEnv === 'development';

            return {
                message: 'A password reset code has been sent to your email.',
                emailSent: true,
                ...(isDevelopment && { debugToken: token })
            };

        } catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to process password reset request');
        }
    }

    async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto, audience?: PasswordResetAudience) {
        const { email, token } = verifyResetCodeDto;

        // Validate inputs
        if (!email || !this.isValidEmail(email)) {
            throw new BadRequestException('Please provide a valid email address');
        }

        if (!token || token.length !== 4 || !this.isNumeric(token)) {
            throw new BadRequestException('Please provide a valid 4-digit reset code');
        }

        // Check if user exists
        const user = await this.userRepository.findByEmail(email);
        if (!user || !this.userMatchesAudience(user, audience)) {
            throw new NotFoundException('User not found');
        }

        // Check if token is valid
        const isValid = await this.passwordResetRepository.isValidToken(email, token);

        if (!isValid) {
            throw new BadRequestException('Invalid or expired reset code. Please request a new one.');
        }

        return {
            message: 'Reset code verified successfully',
            email,
            token
        };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto, audience?: PasswordResetAudience) {
        const { email, token, password, passwordConfirmation } = resetPasswordDto;
        if (!email || !this.isValidEmail(email)) {
            throw new BadRequestException('Please provide a valid email address');
        }
        if (!token || token.length !== 4 || !this.isNumeric(token)) {
            throw new BadRequestException('Please provide a valid 4-digit reset code');
        }
        if (!password || password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters long');
        }
        if (password !== passwordConfirmation) {
            throw new BadRequestException('Passwords do not match');
        }
        if (!this.isStrongPassword(password)) {
            throw new BadRequestException(
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            );
        }
        const user = await this.userRepository.findByEmailWithPassword(email);
        if (!user || !this.userMatchesAudience(user, audience)) {
            throw new NotFoundException('User not found');
        }
        if (user.status !== 'active') {
            throw new BadRequestException('Your account is not active. Please contact support.');
        }
        const resetToken = await this.passwordResetRepository.findByEmailAndToken(email, token);
        if (!resetToken) {
            throw new BadRequestException('Invalid or expired reset code. Please request a new one.');
        }
        try {
            const isSamePassword = await bcrypt.compare(password, user.password);
            if (isSamePassword) {
                throw new BadRequestException('New password cannot be the same as your current password');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            await this.userRepository.update(user._id.toString(), { password: hashedPassword });
            await this.passwordResetRepository.markTokenAsUsed(email, token);
            await this.userRepository.updateRefreshToken(user._id.toString(), null);
            const emailSent = await this.emailService.sendPasswordResetSuccessEmail(
                email,
                `${user.firstName} ${user.lastName}`
            );
            if (!emailSent) {
                console.warn('Password reset success email failed to send, but password was reset successfully');
            }
            await this.notificationService.createUserNotification({
                title: 'Password Reset Successful',
                message: 'Your password has been reset successfully.',
                type: NotificationType.SYSTEM,
                recipient: user._id.toString(),
            });
            return {
                message: 'Password has been reset successfully'
            };

        } catch (error) {
            // Preserve intended HTTP errors (400/404/etc.) instead of converting to 500.
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to reset password');
        }
    }

    async resendResetCode(email: string, audience?: PasswordResetAudience) {
        // Validate email
        if (!email || !this.isValidEmail(email)) {
            throw new BadRequestException('Please provide a valid email address');
        }

        // Check if user exists
        const user = await this.userRepository.findByEmail(email);
        if (!user || !this.userMatchesAudience(user, audience)) {
            // Don't reveal if user exists or not for security
            return {
                message: 'If the email exists, a new reset code has been sent.'
            };
        }

        // Check if user is active
        if (user.status !== 'active') {
            throw new BadRequestException('Your account is not active. Please contact support.');
        }

        try {
            // Generate new token
            const token = this.generateResetToken();

            // Create new reset token
            await this.passwordResetRepository.createResetToken(email, token);

            // Send email with new reset code
            const emailSent = await this.emailService.sendPasswordResetEmail(
                email,
                token,
                `${user.firstName} ${user.lastName}`
            );

            // Check if email was sent successfully
            if (!emailSent) {
                throw new InternalServerErrorException('Failed to send reset code email. Please try again.');
            }

            // Send notification
            await this.notificationService.createUserNotification({
                title: 'New Password Reset Code',
                message: `A new password reset code has been sent to your email. The code will expire in 15 minutes.`,
                type: NotificationType.SYSTEM,
                recipient: user._id.toString(),
                data: { token, expiresIn: '15 minutes' },
            });

            // Security: Only return debug token in development mode (never in production)
            // Check NODE_ENV directly to ensure we never expose tokens in production
            const nodeEnv = process.env.NODE_ENV;
            const isDevelopment = nodeEnv === 'development';

            return {
                message: 'A new password reset code has been sent to your email.',
                emailSent: true,
                ...(isDevelopment && { debugToken: token })
            };

        } catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to resend reset code');
        }
    }

    private userMatchesAudience(user: UserDocument, audience?: PasswordResetAudience): boolean {
        const roles = audience?.allowedRoles;
        if (!roles?.length) {
            return true;
        }
        const r = String(user.role);
        return roles.some((allowed) => String(allowed) === r);
    }

    private generateResetToken(): string {
        // Generate 4-digit random number
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Utility method to clean up expired tokens (can be called by a cron job)
    async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
        return this.passwordResetRepository.cleanupExpiredTokens();
    }

    // Validation helper methods
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private isNumeric(value: string): boolean {
        return /^\d+$/.test(value);
    }

    private isStrongPassword(password: string): boolean {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        return strongPasswordRegex.test(password);
    }
}