import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from 'src/shared/shared.module';
import { NotificationModule } from '../notification/notification.module';
import { RideGateway } from './gateways/ride.gateway';
import { RideMatchingService } from './services/ride-matching.service';
import { RidePaymentCaptureService } from './services/ride-payment-capture.service';
import { RideNotificationService } from './services/ride-notification.service';

@Module({
    imports: [SharedModule, ConfigModule, JwtModule, NotificationModule],
    providers: [RideGateway, RideMatchingService, RidePaymentCaptureService, RideNotificationService],
    exports: [RideGateway, RidePaymentCaptureService, RideNotificationService],
})
export class RideModule { }

