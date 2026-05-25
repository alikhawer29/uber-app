import { Controller, Get, Patch, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationRepository } from 'src/shared/repositories/notification.repository';
import { NotificationStatus } from 'src/shared/schemas/notification.schema';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { PushNotificationService } from 'src/common/services/push-notification.service';

@ApiTags('User — Notifications')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/notifications')
export class UserNotificationsController {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly pushNotificationService: PushNotificationService,
    ) {}

    @Get('push/status')
    @ApiOperation({ summary: 'FCM diagnostics for current user' })
    pushStatus(@CurrentUser() user: { id: string }) {
        return {
            success: true,
            data: {
                userId: user.id,
                ...this.pushNotificationService.getDiagnostics(),
            },
        };
    }

    @Post('push/test')
    @ApiOperation({ summary: 'Send test push to your registered devices' })
    async testPush(@CurrentUser() user: { id: string }) {
        const result = await this.pushNotificationService.sendToUser(
            user.id,
            'Test notification',
            'If you see this, push notifications are working.',
            { type: 'test_push', action: 'open_app' },
        );
        return {
            success: result.successCount > 0,
            message:
                result.successCount > 0
                    ? `Sent to ${result.successCount} device(s). Check server logs for [PUSH].`
                    : `Not delivered: ${result.reason ?? 'check logs'}`,
            data: result,
        };
    }

    @Get()
    @ApiOperation({ summary: 'List notifications (paginated)' })
    async list(
        @CurrentUser() user: { id: string },
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('unreadOnly') unreadOnly?: string,
    ) {
        const status = unreadOnly === 'true' ? NotificationStatus.UNREAD : undefined;
        const result = await this.notificationRepository.paginateUserNotifications(
            user.id,
            Number(page) || 1,
            Number(limit) || 20,
            status,
        );
        const unreadCount = await this.notificationRepository.getUnreadCount(user.id);
        return {
            success: true,
            data: {
                notifications: result.data.map((n: any) => ({
                    notificationId: String(n._id),
                    title: n.title,
                    body: n.message,
                    type: n.type,
                    isRead: n.status === NotificationStatus.READ,
                    createdAt: n.createdAt,
                })),
                unreadCount,
                pagination: { total: result.total, page: result.page, totalPages: result.totalPages, limit: result.limit },
            },
        };
    }

    @Patch(':notificationId/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    async read(@CurrentUser() user: { id: string }, @Param('notificationId') notificationId: string) {
        const updated = await this.notificationRepository.markAsRead(notificationId);
        if (!updated) return { success: false, message: 'Notification not found' };
        return { success: true, message: 'Notification marked as read' };
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    async readAll(@CurrentUser() user: { id: string }) {
        await this.notificationRepository.markAllAsRead(user.id);
        return { success: true, message: 'All notifications marked as read' };
    }
}

