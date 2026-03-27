import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    ) { }

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