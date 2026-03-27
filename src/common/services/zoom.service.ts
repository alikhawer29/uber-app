import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class ZoomService {
    private readonly logger = new Logger(ZoomService.name);
    private readonly zoomSdkKey: string; // Video SDK Key (from ZOOM_SDK_KEY env var)
    private readonly zoomSdkSecret: string; // Video SDK Secret (from ZOOM_SDK_SECRET env var)

    constructor(private readonly configService: ConfigService) {
        this.zoomSdkKey = this.configService.get<string>('zoom.sdkKey') || ''; // Video SDK Key from ZOOM_SDK_KEY
        this.zoomSdkSecret = this.configService.get<string>('zoom.sdkSecret') || ''; // Video SDK Secret from ZOOM_SDK_SECRET

        // Log Video SDK credential status
        if (this.zoomSdkKey && this.zoomSdkSecret) {
            this.logger.log('Zoom Video SDK credentials loaded successfully');
            this.logger.debug(`Zoom SDK Key length: ${this.zoomSdkKey.length}`);
            this.logger.debug(`Zoom SDK Key (first 8 chars): ${this.zoomSdkKey.substring(0, 8)}...`);
            this.logger.debug(`Zoom SDK Key (last 8 chars): ...${this.zoomSdkKey.substring(this.zoomSdkKey.length - 8)}`);
            this.logger.debug(`Zoom SDK Secret length: ${this.zoomSdkSecret.length}`);

            // Verify SDK Key format (should be alphanumeric, typically 40-50 chars)
            if (this.zoomSdkKey.length < 20 || this.zoomSdkKey.length > 100) {
                this.logger.warn(`SDK Key length (${this.zoomSdkKey.length}) seems unusual. Expected 20-100 characters.`);
            }

            // Verify SDK Secret format (should be alphanumeric, typically 30-50 chars)
            if (this.zoomSdkSecret.length < 20 || this.zoomSdkSecret.length > 100) {
                this.logger.warn(`SDK Secret length (${this.zoomSdkSecret.length}) seems unusual. Expected 20-100 characters.`);
            }
        } else {
            this.logger.warn('Zoom Video SDK credentials not fully configured');
            this.logger.debug(`SDK Key present: ${!!this.zoomSdkKey}, SDK Secret present: ${!!this.zoomSdkSecret}`);
        }
    }


    /**
     * Generate a Video SDK Access Token (JWT) for Zoom Video SDK
     * This token is used to authenticate users joining/creating video sessions via the Zoom Video SDK
     * 
     * @param sessionName - Unique session name/identifier (e.g., booking ID, room name)
     * @param role - User role: 0 = participant, 1 = host
     * @param userIdentity - Optional user identity (email or user ID)
     * @param expirationMinutes - Token expiration in minutes (default: 2 hours)
     * @returns JWT access token string
     */
    generateVideoSDKAccessToken(
        sessionName: string,
        role: number = 0,
        userIdentity?: string,
        expirationMinutes: number = 120
    ): string {
        // Validate Video SDK credentials are configured
        if (!this.zoomSdkKey || !this.zoomSdkSecret) {
            throw new BadRequestException(
                'Zoom Video SDK credentials are not configured. ' +
                'Please set ZOOM_SDK_KEY and ZOOM_SDK_SECRET in your .env file.'
            );
        }

        // Validate role is 0 (participant) or 1 (host)
        if (role !== 0 && role !== 1) {
            throw new BadRequestException('Role must be 0 (participant) or 1 (host)');
        }

        // Validate session name
        if (!sessionName || sessionName.trim() === '') {
            throw new BadRequestException('Session name is required');
        }

        try {
            // Calculate expiration timestamp (in seconds)
            const now = Math.floor(Date.now() / 1000);
            const expiration = now + (expirationMinutes * 60);

            // Create JWT payload according to Zoom Video SDK requirements
            // CRITICAL: According to official Zoom Video SDK implementation, the field is "role_type" NOT "role"
            // Reference: https://github.com/zoom/videosdk-auth-endpoint-sample
            const roleNum = typeof role === 'string' ? parseInt(role, 10) : Number(role);
            if (isNaN(roleNum) || (roleNum !== 0 && roleNum !== 1)) {
                throw new BadRequestException(`Invalid role: ${role}. Role must be 0 (participant) or 1 (host)`);
            }

            const payload: any = {
                app_key: this.zoomSdkKey.trim(), // Zoom Video SDK Key (trimmed to remove any whitespace)
                role_type: roleNum, // User role: 0 = participant, 1 = host (MUST be number) - NOTE: field name is "role_type" not "role"
                tpc: sessionName.trim(), // Topic/Session name (required)
                version: 1, // SDK version
                iat: now, // Issued at time (Unix timestamp in seconds)
                exp: expiration, // Expiration time (Unix timestamp in seconds)
            };

            // Add user identity if provided (optional but recommended)
            if (userIdentity) {
                payload.user_identity = userIdentity.trim();
            }

            // Log payload for debugging (without sensitive data)
            this.logger.debug(`Generating Video SDK token with payload:`, {
                app_key: `${this.zoomSdkKey.substring(0, 8)}...`,
                tpc: payload.tpc,
                role_type: payload.role_type,
                roleType: typeof payload.role_type,
                version: payload.version,
                hasUserIdentity: !!payload.user_identity,
            });

            // Sign JWT using HS256 algorithm with Video SDK Secret
            const accessToken = jwt.sign(payload, this.zoomSdkSecret, {
                algorithm: 'HS256',
            });

            // Verify the token signature matches the secret (critical validation)
            try {
                jwt.verify(accessToken, this.zoomSdkSecret, {
                    algorithms: ['HS256'],
                });
                this.logger.debug('Token signature verified successfully');
            } catch (verifyError: any) {
                this.logger.error('Token signature verification failed:', verifyError.message);
                throw new BadRequestException(`Token signature verification failed: ${verifyError.message}`);
            }

            // Decode and verify the token structure (for debugging)
            const decoded = jwt.decode(accessToken, { complete: true }) as any;
            const decodedPayload = decoded?.payload || decoded;

            // Verify app_key matches SDK Key (trimmed comparison)
            const tokenAppKey = decodedPayload?.app_key?.trim();
            const expectedAppKey = this.zoomSdkKey.trim();
            if (tokenAppKey !== expectedAppKey) {
                this.logger.error('Token app_key mismatch!', {
                    tokenAppKey: tokenAppKey,
                    expectedAppKey: expectedAppKey,
                    match: tokenAppKey === expectedAppKey,
                    tokenAppKeyLength: tokenAppKey?.length,
                    expectedAppKeyLength: expectedAppKey.length,
                });
                throw new BadRequestException('Token app_key does not match SDK Key. Please verify ZOOM_SDK_KEY in .env matches your Zoom Video SDK app.');
            }

            // Verify role_type is a number (not string) - NOTE: field name is "role_type" not "role"
            const decodedRoleType = decodedPayload?.role_type;
            if (typeof decodedRoleType !== 'number') {
                this.logger.error('Token role_type is not a number!', {
                    role_type: decodedRoleType,
                    roleType: typeof decodedRoleType,
                    roleValue: decodedRoleType,
                });
                throw new BadRequestException(`Token role_type must be a number (0 or 1), but got ${typeof decodedRoleType}: ${decodedRoleType}`);
            }

            // Log complete token structure for debugging
            this.logger.log(`Generated Video SDK access token for session ${sessionName}`, {
                sessionName: decodedPayload?.tpc,
                role_type: decodedRoleType,
                roleType: typeof decodedRoleType,
                roleIsValid: decodedRoleType === 0 || decodedRoleType === 1,
                app_key: tokenAppKey === expectedAppKey ? '✓ Match' : '✗ Mismatch',
                app_keyLength: tokenAppKey?.length,
                sdkKeyLength: expectedAppKey.length,
                version: decodedPayload?.version,
                hasUserIdentity: !!decodedPayload?.user_identity,
                expiresIn: decodedPayload?.exp - decodedPayload?.iat,
                fullPayload: JSON.stringify(decodedPayload, null, 2),
            });

            return accessToken;
        } catch (error: any) {
            this.logger.error(`Failed to generate Video SDK access token: ${error.message}`, error);
            throw new BadRequestException(`Failed to generate Video SDK access token: ${error.message}`);
        }
    }

    /**
     * Verify SDK credentials and token format
     * Useful for debugging credential mismatch issues
     */
    verifyCredentials(): {
        sdkKeyConfigured: boolean;
        sdkSecretConfigured: boolean;
        sdkKeyLength: number;
        sdkSecretLength: number;
        sdkKeyPreview: string;
        sdkKeyFirst8: string;
        sdkKeyLast8: string;
        sdkSecretFirst8: string;
        sdkSecretLast8: string;
        recommendations: string[];
    } {
        const recommendations: string[] = [];

        if (!this.zoomSdkKey || !this.zoomSdkSecret) {
            recommendations.push('ZOOM_SDK_KEY and ZOOM_SDK_SECRET must be set in .env file');
        }

        if (this.zoomSdkKey && (this.zoomSdkKey.length < 20 || this.zoomSdkKey.length > 100)) {
            recommendations.push(`SDK Key length (${this.zoomSdkKey.length}) seems unusual. Verify it matches your Zoom Marketplace app.`);
        }

        if (this.zoomSdkSecret && (this.zoomSdkSecret.length < 20 || this.zoomSdkSecret.length > 100)) {
            recommendations.push(`SDK Secret length (${this.zoomSdkSecret.length}) seems unusual. Verify it matches your Zoom Marketplace app.`);
        }

        if (this.zoomSdkKey && this.zoomSdkKey.includes(' ')) {
            recommendations.push('SDK Key contains spaces. Remove any leading/trailing spaces in .env file.');
        }

        if (this.zoomSdkSecret && this.zoomSdkSecret.includes(' ')) {
            recommendations.push('SDK Secret contains spaces. Remove any leading/trailing spaces in .env file.');
        }

        return {
            sdkKeyConfigured: !!this.zoomSdkKey,
            sdkSecretConfigured: !!this.zoomSdkSecret,
            sdkKeyLength: this.zoomSdkKey?.length || 0,
            sdkSecretLength: this.zoomSdkSecret?.length || 0,
            sdkKeyPreview: this.zoomSdkKey ? `${this.zoomSdkKey.substring(0, 8)}...${this.zoomSdkKey.substring(this.zoomSdkKey.length - 8)}` : 'Not configured',
            sdkKeyFirst8: this.zoomSdkKey?.substring(0, 8) || 'N/A',
            sdkKeyLast8: this.zoomSdkKey ? this.zoomSdkKey.substring(this.zoomSdkKey.length - 8) : 'N/A',
            sdkSecretFirst8: this.zoomSdkSecret?.substring(0, 8) || 'N/A',
            sdkSecretLast8: this.zoomSdkSecret ? this.zoomSdkSecret.substring(this.zoomSdkSecret.length - 8) : 'N/A',
            recommendations,
        };
    }
}

