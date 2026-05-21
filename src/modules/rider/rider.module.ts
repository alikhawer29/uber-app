import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { SharedModule } from 'src/shared/shared.module';
import { CommonModule } from 'src/common/common.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { RideModule } from '../ride/ride.module';
import { multerConfig } from 'src/config/multer.config';
import { RiderAuthController } from './controllers/rider-auth.controller';
import { RiderVehicleController } from './controllers/rider-vehicle.controller';
import { RiderContactController } from './controllers/rider-contact.controller';
import { RiderLocationController, RiderRidesController } from './controllers/rider-rides.controller';
import { RiderNotificationsController } from './controllers/rider-notifications.controller';
import { RiderWalletController } from './controllers/rider-wallet.controller';
import { RiderRatingsController } from './controllers/rider-ratings.controller';
import { RiderProfileController } from './controllers/rider-profile.controller';
import { RiderAuthService } from './services/rider-auth.service';
import { RiderVehicleUpdateService } from './services/rider-vehicle-update.service';
import { RiderRidesService } from './services/rider-rides.service';
import { RiderWalletService } from './services/rider-wallet.service';
import { RiderRatingsService } from './services/rider-ratings.service';
import { RiderProfileService } from './services/rider-profile.service';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        UserModule,
        ConfigModule,
        NotificationModule,
        RideModule,
        MulterModule.register(multerConfig),
    ],
    controllers: [
        RiderAuthController,
        RiderVehicleController,
        RiderContactController,
        RiderRidesController,
        RiderLocationController,
        RiderNotificationsController,
        RiderWalletController,
        RiderRatingsController,
        RiderProfileController,
    ],
    providers: [
        RiderAuthService,
        RiderVehicleUpdateService,
        RiderRidesService,
        RiderWalletService,
        RiderRatingsService,
        RiderProfileService,
    ],
    exports: [
        RiderAuthService,
        RiderVehicleUpdateService,
        RiderRidesService,
        RiderWalletService,
        RiderRatingsService,
        RiderProfileService,
    ],
})
export class RiderModule {}
