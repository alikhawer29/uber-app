import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationRepository } from 'src/shared/repositories/notification.repository';
import { NotificationStatus } from 'src/shared/schemas/notification.schema';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { PushNotificationService } from 'src/common/services/push-notification.service';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { TestPushDto } from '../dto/test-push.dto';

@ApiTags('Admin — Notifications')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/notifications')
export class AdminNotificationsController {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly pushNotificationService: PushNotificationService,
        private readonly userRepository: UserRepository,
    ) {}

    @Get('push/status')
    @ApiOperation({ summary: 'FCM / push diagnostics (check server logs too)' })
    pushStatus() {
        return {
            success: true,
            data: this.pushNotificationService.getDiagnostics(),
        };
    }

    @Post('push/test')
    @ApiOperation({
        summary: 'Send a test push to a user',
        description:
            'Sends directly via FCM (bypasses inbox). Check PM2/server logs for [PUSH] lines. Default target: your admin user id.',
    })
    async testPush(@CurrentUser() admin: { id: string }, @Body() dto: TestPushDto) {
        const targetUserId = dto.userId?.trim() || admin.id;
        const user = await this.userRepository.findById(targetUserId);
        if (!user) {
            return { success: false, message: 'User not found' };
        }
        const title = dto.title?.trim() || 'Test notification';
        const body = dto.body?.trim() || 'Push test from Vilaire Valcin backend';
        const result = await this.pushNotificationService.sendToUser(targetUserId, title, body, {
            type: 'test_push',
            action: 'open_app',
        });
        return {
            success: result.successCount > 0,
            message:
                result.successCount > 0
                    ? `Push sent to ${result.successCount} device(s)`
                    : `Push not delivered (${result.reason ?? 'see server logs'})`,
            data: {
                targetUserId,
                email: user.email,
                tokenCount: user.fcmTokens?.length ?? 0,
                ...result,
            },
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
                pagination: {
                    total: result.total,
                    page: result.page,
                    totalPages: result.totalPages,
                    limit: result.limit,
                },
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
