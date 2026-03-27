import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/notifications',
})
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationGateway.name);
    private connectedUsers = new Map<string, string>(); // userId -> socketId

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        // Listen for notification events
        this.eventEmitter.on('notification.created', (notification) => {
            this.sendNotificationToUser(notification.recipient.toString(), notification);
        });
    }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token || client.handshake.headers.token;

            if (!token) {
                client.disconnect();
                return;
            }

            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get('jwt.secret'),
            });

            const userId = payload.sub;
            this.connectedUsers.set(userId, client.id);

            client.data.userId = userId;

            this.logger.log(`Client connected: ${client.id}, User: ${userId}`);

            // Join user to their personal room
            client.join(`user_${userId}`);

            client.emit('connected', { message: 'Connected to notifications', userId });
        } catch (error) {
            this.logger.error('Authentication failed:', error);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.data.userId;
        if (userId) {
            this.connectedUsers.delete(userId);
            this.logger.log(`Client disconnected: ${client.id}, User: ${userId}`);
        }
    }

    sendNotificationToUser(userId: string, notification: any) {
        this.server.to(`user_${userId}`).emit('new_notification', notification);
    }

    sendToAll(message: string, data: any) {
        this.server.emit(message, data);
    }

    @SubscribeMessage('mark_as_read')
    async handleMarkAsRead(client: Socket, data: { notificationId: string }) {
        const userId = client.data.userId;
        this.logger.log(`User ${userId} marked notification ${data.notificationId} as read`);

        // You can emit back to the client if needed
        client.emit('notification_updated', {
            notificationId: data.notificationId,
            status: 'read'
        });
    }

    @SubscribeMessage('subscribe_to_notifications')
    handleSubscribeToNotifications(client: Socket) {
        const userId = client.data.userId;
        this.logger.log(`User ${userId} subscribed to notifications`);
        client.emit('subscribed', { message: 'Subscribed to notifications' });
    }
}