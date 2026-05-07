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
import { RiderAuthService } from './services/rider-auth.service';
import { RiderVehicleUpdateService } from './services/rider-vehicle-update.service';
import { RiderRidesService } from './services/rider-rides.service';

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
    ],
    providers: [RiderAuthService, RiderVehicleUpdateService, RiderRidesService],
    exports: [RiderAuthService, RiderVehicleUpdateService, RiderRidesService],
})
export class RiderModule {}
