import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PushNotificationService } from 'src/common/services/push-notification.service';
import { UserRole } from 'src/common/constants/user.constants';
import { NotificationRepository } from 'src/shared/repositories/notification.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { NotificationStatus, NotificationType } from 'src/shared/schemas/notification.schema';
// import { NotificationRepository } from '../../../../shared/repositories/notification.repository';
// import { NotificationType, NotificationStatus } from '../../../../shared/schemas/notification.schema';
// import { UserRepository } from '../../../../shared/repositories/user.repository';
// import { UserRole } from '../../../../common/constants/user.constants';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userRepository: UserRepository,
        private readonly eventEmitter: EventEmitter2,
        private readonly pushNotificationService: PushNotificationService,
    ) { }

    /** FCM `data` payload values must be strings. */
    private buildPushDataPayload(
        notificationId: string,
        type: NotificationType,
        extra?: Record<string, unknown>,
    ): Record<string, string> {
        const out: Record<string, string> = {
            notificationId,
            type,
        };
        if (extra && typeof extra === 'object') {
            try {
                out.payload = JSON.stringify(extra);
            } catch {
                /* ignore */
            }
        }
        return out;
    }

    private dispatchPushAfterPersist(data: {
        recipientId: string;
        title: string;
        message: string;
        type: NotificationType;
        notificationId: string;
        extra?: Record<string, any>;
    }): void {
        const payload = this.buildPushDataPayload(
            data.notificationId,
            data.type,
            data.extra as Record<string, unknown> | undefined,
        );
        void this.pushNotificationService
            .sendToUser(data.recipientId, data.title, data.message, payload)
            .then((r) => {
                if (r.successCount === 0 && r.failureCount === 0) {
                    this.logger.debug(`Push skipped or no tokens for recipient ${data.recipientId}`);
                }
            })
            .catch((err) =>
                this.logger.warn(
                    `Push failed for recipient ${data.recipientId}: ${err instanceof Error ? err.message : err}`,
                ),
            );
    }

    async createUserNotification(data: {
        title: string;
        message: string;
        type: NotificationType;
        recipient: string;
        sender?: string;
        data?: Record<string, any>;
    }) {
        try {
            const notification = await this.notificationRepository.createNotification(data);

            // Emit event for real-time notifications
            this.eventEmitter.emit('notification.created', notification);

            const nid = String((notification as any)._id);
            this.dispatchPushAfterPersist({
                recipientId: data.recipient,
                title: data.title,
                message: data.message,
                type: data.type,
                notificationId: nid,
                extra: data.data,
            });

            this.logger.debug(`Notification created for user ${data.recipient}: ${data.title}`);
            return notification;
        } catch (error) {
            this.logger.error(`Failed to create notification for user ${data.recipient}:`, error);
            throw error;
        }
    }

    async notifyAdmins(data: {
        title: string;
        message: string;
        type: NotificationType;
        sender?: string;
        data?: Record<string, any>;
    }) {
        try {
            // Find all admin users directly using repository method
            const adminUsers = await this.userRepository.findUsersWithRole(UserRole.ADMIN);

            if (!adminUsers || adminUsers.length === 0) {
                this.logger.warn('No admin users found. Notification not sent.');
                return [];
            }

            this.logger.log(`Sending notification to ${adminUsers.length} admin(s): ${data.title}`);

            const notifications = await Promise.all(
                adminUsers.map(async (admin) => {
                    try {
                        // Handle ObjectId conversion properly
                        const recipientId = admin._id?.toString ? admin._id.toString() : String(admin._id);

                        return await this.createUserNotification({
                            ...data,
                            recipient: recipientId,
                        });
                    } catch (error) {
                        this.logger.error(`Failed to send notification to admin ${admin._id}:`, error);
                        return null;
                    }
                })
            );

            // Filter out null values (failed notifications)
            const successfulNotifications = notifications.filter(n => n !== null);
            this.logger.log(`Successfully sent ${successfulNotifications.length} out of ${adminUsers.length} notifications`);

            return successfulNotifications;
        } catch (error) {
            this.logger.error('Error in notifyAdmins:', error);
            throw error;
        }
    }

    /**
     * Persist a notification for a single user. Swallows errors so approval/reject flows are not rolled back.
     */
    async notifyUserNonBlocking(params: {
        recipientId: string;
        title: string;
        message: string;
        type: NotificationType;
        senderId?: string;
        data?: Record<string, unknown>;
    }): Promise<void> {
        if (!params.recipientId?.trim()) {
            this.logger.warn('notifyUserNonBlocking: missing recipientId');
            return;
        }
        try {
            await this.createUserNotification({
                recipient: params.recipientId.trim(),
                title: params.title,
                message: params.message,
                type: params.type,
                sender: params.senderId,
                data: params.data as Record<string, any> | undefined,
            });
        } catch (error) {
            this.logger.error(
                `notifyUserNonBlocking failed for recipient ${params.recipientId}: ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    async getUserNotifications(userId: string, status?: NotificationStatus) {
        return this.notificationRepository.findByRecipient(userId, status);
    }

    async markAsRead(notificationId: string) {
        return this.notificationRepository.markAsRead(notificationId);
    }

    async markAllAsRead(userId: string) {
        return this.notificationRepository.markAllAsRead(userId);
    }

    async getUnreadCount(userId: string) {
        return this.notificationRepository.getUnreadCount(userId);
    }

    async deleteNotification(notificationId: string, userId: string) {
        const notification = await this.notificationRepository.findById(notificationId);

        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.recipient.toString() !== userId) {
            throw new Error('You can only delete your own notifications');
        }

        return this.notificationRepository.update(notificationId, { status: NotificationStatus.ARCHIVED });
    }

    // Specialized notification methods
    async notifyContactFormSubmission(contactData: {
        name: string;
        email: string;
        subject: string;
        message: string;
    }) {
        return this.notifyAdmins({
            title: 'New Contact Form Submission',
            message: `New contact form submitted by ${contactData.name} (${contactData.email})`,
            type: NotificationType.CONTACT_FORM,
            data: contactData,
        });
    }

    async notifyFileUpload(user: any, fileData: any) {
        return this.createUserNotification({
            title: 'File Uploaded Successfully',
            message: `Your file "${fileData.originalName}" has been uploaded successfully`,
            type: NotificationType.FILE_UPLOAD,
            recipient: user.id,
            data: fileData,
        });
    }

    async notifyNewUserRegistration(userData: any) {
        return this.notifyAdmins({
            title: 'New User Registration',
            message: `New user registered: ${userData.firstName} ${userData.lastName} (${userData.email})`,
            type: NotificationType.USER_ACTION,
            data: userData,
        });
    }
}