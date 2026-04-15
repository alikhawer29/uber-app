import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { SharedModule } from 'src/shared/shared.module';
import { CommonModule } from 'src/common/common.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { multerConfig } from 'src/config/multer.config';
import { RiderAuthController } from './controllers/rider-auth.controller';
import { RiderVehicleController } from './controllers/rider-vehicle.controller';
import { RiderAuthService } from './services/rider-auth.service';
import { RiderVehicleUpdateService } from './services/rider-vehicle-update.service';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        UserModule,
        ConfigModule,
        NotificationModule,
        MulterModule.register(multerConfig),
    ],
    controllers: [RiderAuthController, RiderVehicleController],
    providers: [RiderAuthService, RiderVehicleUpdateService],
    exports: [RiderAuthService, RiderVehicleUpdateService],
})
export class RiderModule {}
