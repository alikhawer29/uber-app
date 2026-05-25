import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';
import { UserRepository } from '../../shared/repositories/user.repository';
import { maskFcmToken } from '../utils/fcm-token.util';

export type PushSendResult = {
    successCount: number;
    failureCount: number;
    skipped: boolean;
    reason?: string;
    details?: Array<{ token: string; success: boolean; messageId?: string; errorCode?: string; errorMessage?: string }>;
};

@Injectable()
export class PushNotificationService implements OnModuleInit {
    private readonly logger = new Logger(PushNotificationService.name);

    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly userRepository: UserRepository,
        private readonly configService: ConfigService,
    ) {}

    onModuleInit() {
        const ready = this.firebaseService.isInitialized();
        const path = this.configService.get<string>('firebase.serviceAccountPath');
        const channel = this.getAndroidChannelId();
        if (ready) {
            this.logger.log(
                `[FCM] Ready — project initialized, androidChannelId="${channel}"${path ? `, serviceAccountPath="${path}"` : ''}`,
            );
        } else {
            this.logger.error(
                '[FCM] NOT initialized — push will be skipped. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env',
            );
        }
    }

    getDiagnostics() {
        return {
            firebaseInitialized: this.firebaseService.isInitialized(),
            androidChannelId: this.getAndroidChannelId(),
            serviceAccountPath: this.configService.get<string>('firebase.serviceAccountPath') ?? null,
            hasServiceAccountJson: !!this.configService.get<string>('firebase.serviceAccountJson'),
        };
    }

    private getAndroidChannelId(): string {
        return this.configService.get<string>('firebase.androidChannelId') || 'default';
    }

    private buildMessage(
        title: string,
        body: string,
        data: Record<string, string> | undefined,
        token: string,
    ): admin.messaging.Message {
        return {
            notification: { title, body },
            data: data || {},
            token,
            android: {
                priority: 'high' as const,
                notification: {
                    sound: 'default',
                    channelId: this.getAndroidChannelId(),
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };
    }

    /**
     * Send push notification to a single device token
     */
    async sendToDevice(
        deviceToken: string,
        title: string,
        body: string,
        data?: Record<string, string>,
        context?: { userId?: string },
    ): Promise<boolean> {
        const result = await this.sendToDevices([deviceToken], title, body, data, context);
        return result.successCount > 0;
    }

    /**
     * Send push notification to multiple device tokens (one FCM request per token for clear per-device logs).
     */
    async sendToDevices(
        deviceTokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
        context?: { userId?: string },
    ): Promise<PushSendResult> {
        const userLabel = context?.userId ? `userId=${context.userId}` : 'userId=unknown';

        if (!this.firebaseService.isInitialized()) {
            this.logger.error(`[PUSH] ${userLabel} — Firebase not initialized, ${deviceTokens.length} token(s) skipped`);
            return {
                successCount: 0,
                failureCount: deviceTokens.length,
                skipped: true,
                reason: 'firebase_not_initialized',
            };
        }

        const tokens = [...new Set(deviceTokens.map((t) => t?.trim()).filter(Boolean))];
        if (tokens.length === 0) {
            this.logger.warn(`[PUSH] ${userLabel} — no valid FCM tokens`);
            return { successCount: 0, failureCount: 0, skipped: true, reason: 'no_tokens' };
        }

        const messaging = this.firebaseService.getMessaging();
        if (!messaging) {
            this.logger.error(`[PUSH] ${userLabel} — messaging instance unavailable`);
            return {
                successCount: 0,
                failureCount: tokens.length,
                skipped: true,
                reason: 'messaging_unavailable',
            };
        }

        this.logger.log(
            `[PUSH] ${userLabel} — sending "${title}" to ${tokens.length} device(s): ${tokens.map(maskFcmToken).join(', ')}`,
        );

        const details: PushSendResult['details'] = [];
        let successCount = 0;
        let failureCount = 0;
        const invalidTokens: string[] = [];

        for (const token of tokens) {
            try {
                const messageId = await messaging.send(this.buildMessage(title, body, data, token));
                successCount += 1;
                details.push({ token: maskFcmToken(token), success: true, messageId });
                this.logger.log(`[PUSH] ${userLabel} — OK ${maskFcmToken(token)} messageId=${messageId}`);
            } catch (error: any) {
                failureCount += 1;
                const errorCode = error?.code as string | undefined;
                const errorMessage = error?.message as string | undefined;
                details.push({
                    token: maskFcmToken(token),
                    success: false,
                    errorCode,
                    errorMessage,
                });
                this.logger.error(
                    `[PUSH] ${userLabel} — FAIL ${maskFcmToken(token)} code=${errorCode ?? 'unknown'} msg=${errorMessage ?? error}`,
                );
                if (
                    errorCode === 'messaging/invalid-registration-token' ||
                    errorCode === 'messaging/registration-token-not-registered'
                ) {
                    invalidTokens.push(token);
                }
            }
        }

        if (invalidTokens.length > 0 && context?.userId) {
            await this.removeInvalidTokensFromUser(context.userId, invalidTokens);
        } else if (invalidTokens.length > 0) {
            await this.removeInvalidTokens(invalidTokens);
        }

        this.logger.log(
            `[PUSH] ${userLabel} — done success=${successCount} failure=${failureCount} title="${title}"`,
        );

        return { successCount, failureCount, skipped: false, details };
    }

    /**
     * Send push notification to a user by user ID
     */
    async sendToUser(
        userId: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<PushSendResult> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                this.logger.warn(`[PUSH] userId=${userId} — user not found`);
                return { successCount: 0, failureCount: 0, skipped: true, reason: 'user_not_found' };
            }

            const fcmTokens = user.fcmTokens || [];
            if (fcmTokens.length === 0) {
                this.logger.warn(`[PUSH] userId=${userId} email=${user.email} — no FCM tokens on profile`);
                return { successCount: 0, failureCount: 0, skipped: true, reason: 'no_fcm_tokens' };
            }

            this.logger.log(
                `[PUSH] userId=${userId} email=${user.email} — ${fcmTokens.length} token(s) registered`,
            );

            return await this.sendToDevices(fcmTokens, title, body, data, { userId });
        } catch (error: any) {
            this.logger.error(`[PUSH] userId=${userId} — exception: ${error?.message ?? error}`);
            return { successCount: 0, failureCount: 0, skipped: true, reason: 'exception' };
        }
    }

    async sendVideoSessionStartNotification(
        userId: string,
        bookingId: string,
        sessionName: string,
    ): Promise<boolean> {
        const result = await this.sendToUser(userId, 'Video Session Started', 'Admin has started the video session. Tap to join.', {
            type: 'video_session_start',
            bookingId,
            sessionName,
            action: 'join_session',
        });
        return result.successCount > 0;
    }

    async sendVideoSessionEndNotification(
        userId: string,
        bookingId: string,
        reason?: string,
    ): Promise<boolean> {
        const data: Record<string, string> = {
            type: 'video_session_end',
            bookingId,
            action: 'session_ended',
        };
        if (reason) data.reason = reason;
        const result = await this.sendToUser(userId, 'Video Session Ended', reason || 'The video session has ended.', data);
        return result.successCount > 0;
    }

    private async removeInvalidTokensFromUser(userId: string, invalidTokens: string[]): Promise<void> {
        for (const token of invalidTokens) {
            await this.userRepository.removeFcmTokenFromUser(userId, token);
        }
        this.logger.warn(
            `[PUSH] userId=${userId} — removed ${invalidTokens.length} invalid FCM token(s) from profile`,
        );
    }

    private async removeInvalidTokens(invalidTokens: string[]): Promise<void> {
        try {
            for (const token of invalidTokens) {
                await this.userRepository.removeFcmToken(token);
            }
            this.logger.log(`[PUSH] removed ${invalidTokens.length} invalid FCM token(s) globally`);
        } catch (error: any) {
            this.logger.error(`[PUSH] failed to remove invalid tokens: ${error?.message ?? error}`);
        }
    }
}
