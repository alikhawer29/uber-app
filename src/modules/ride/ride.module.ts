import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from 'src/shared/shared.module';
import { RideGateway } from './gateways/ride.gateway';
import { RideMatchingService } from './services/ride-matching.service';
import { RidePaymentCaptureService } from './services/ride-payment-capture.service';

@Module({
    imports: [SharedModule, ConfigModule, JwtModule],
    providers: [RideGateway, RideMatchingService, RidePaymentCaptureService],
    exports: [RideGateway, RidePaymentCaptureService],
})
export class RideModule { }

