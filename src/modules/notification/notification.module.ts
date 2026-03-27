import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SharedModule } from '../../shared/shared.module';
import { NotificationService } from './services/notification.service';
import { NotificationGateway } from './gateways/notification.gateway';

@Module({
    imports: [SharedModule, ConfigModule, JwtModule, EventEmitterModule.forRoot()],
    providers: [NotificationService, NotificationGateway],
    exports: [NotificationService],
})
export class NotificationModule { }