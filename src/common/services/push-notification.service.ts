import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';
import { UserRepository } from '../../shared/repositories/user.repository';

@Injectable()
export class PushNotificationService {
    private readonly logger = new Logger(PushNotificationService.name);

    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly userRepository: UserRepository,
    ) { }

    /**
     * Send push notification to a single device token
     */
    async sendToDevice(
        deviceToken: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<boolean> {
        if (!this.firebaseService.isInitialized()) {
            this.logger.warn('Firebase is not initialized. Cannot send push notification.');
            return false;
        }

        const messaging = this.firebaseService.getMessaging();
        if (!messaging) {
            return false;
        }

        try {
            const message: admin.messaging.Message = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                token: deviceToken,
                android: {
                    priority: 'high' as const,
                    notification: {
                        sound: 'default',
                        channelId: 'video_sessions',
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

            const response = await messaging.send(message);
            this.logger.log(`Push notification sent successfully: ${response}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send push notification to device ${deviceToken}:`, error.message);
            
            // Handle invalid token errors
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered') {
                this.logger.warn(`Invalid or unregistered token: ${deviceToken}`);
            }
            
            return false;
        }
    }

    /**
     * Send push notification to multiple device tokens
     */
    async sendToDevices(
        deviceTokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<{ successCount: number; failureCount: number }> {
        if (!this.firebaseService.isInitialized()) {
            this.logger.warn('Firebase is not initialized. Cannot send push notifications.');
            return { successCount: 0, failureCount: deviceTokens.length };
        }

        if (deviceTokens.length === 0) {
            return { successCount: 0, failureCount: 0 };
        }

        const messaging = this.firebaseService.getMessaging();
        if (!messaging) {
            return { successCount: 0, failureCount: deviceTokens.length };
        }

        try {
            const message: admin.messaging.MulticastMessage = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                tokens: deviceTokens,
                android: {
                    priority: 'high' as const,
                    notification: {
                        sound: 'default',
                        channelId: 'video_sessions',
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

            const response = await messaging.sendEachForMulticast(message);
            
            this.logger.log(
                `Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`
            );

            // Remove invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(deviceTokens[idx]);
                        }
                    }
                });

                if (invalidTokens.length > 0) {
                    this.logger.warn(`Found ${invalidTokens.length} invalid tokens. They should be removed from user profiles.`);
                    // Optionally: Remove invalid tokens from database
                    await this.removeInvalidTokens(invalidTokens);
                }
            }

            return {
                successCount: response.successCount,
                failureCount: response.failureCount,
            };
        } catch (error: any) {
            this.logger.error(`Failed to send push notifications:`, error.message);
            return { successCount: 0, failureCount: deviceTokens.length };
        }
    }

    /**
     * Send push notification to a user by user ID
     * Fetches user's device tokens and sends to all of them
     */
    async sendToUser(
        userId: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<{ successCount: number; failureCount: number }> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                this.logger.warn(`User not found: ${userId}`);
                return { successCount: 0, failureCount: 0 };
            }

            const fcmTokens = user.fcmTokens || [];
            if (fcmTokens.length === 0) {
                this.logger.warn(`User ${userId} has no FCM tokens registered`);
                return { successCount: 0, failureCount: 0 };
            }

            return await this.sendToDevices(fcmTokens, title, body, data);
        } catch (error: any) {
            this.logger.error(`Failed to send push notification to user ${userId}:`, error.message);
            return { successCount: 0, failureCount: 0 };
        }
    }

    /**
     * Send video session start notification
     */
    async sendVideoSessionStartNotification(
        userId: string,
        bookingId: string,
        sessionName: string,
    ): Promise<boolean> {
        const title = 'Video Session Started';
        const body = 'Admin has started the video session. Tap to join.';
        const data = {
            type: 'video_session_start',
            bookingId,
            sessionName,
            action: 'join_session',
        };

        const result = await this.sendToUser(userId, title, body, data);
        return result.successCount > 0;
    }

    /**
     * Send video session end notification
     */
    async sendVideoSessionEndNotification(
        userId: string,
        bookingId: string,
        reason?: string,
    ): Promise<boolean> {
        const title = 'Video Session Ended';
        const body = reason || 'The video session has ended.';
        const data = {
            type: 'video_session_end',
            bookingId,
            action: 'session_ended',
        };

        if (reason) {
            data['reason'] = reason;
        }

        const result = await this.sendToUser(userId, title, body, data);
        return result.successCount > 0;
    }

    /**
     * Remove invalid FCM tokens from all users
     */
    private async removeInvalidTokens(invalidTokens: string[]): Promise<void> {
        try {
            // Find all users with these tokens and remove them
            for (const token of invalidTokens) {
                await this.userRepository.removeFcmToken(token);
            }
            this.logger.log(`Removed ${invalidTokens.length} invalid FCM tokens from user profiles`);
        } catch (error: any) {
            this.logger.error(`Failed to remove invalid tokens:`, error.message);
        }
    }
}

