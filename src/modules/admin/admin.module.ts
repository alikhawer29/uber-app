import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from 'src/shared/shared.module';
import { multerConfig } from 'src/config/multer.config';
import { AdminVehicleTypeController } from './controllers/admin-vehicle-type.controller';
import { AdminFareController } from './controllers/admin-fare.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminPasswordResetController } from './controllers/admin-password-reset.controller';
import { AdminVehicleTypeService } from './services/admin-vehicle-type.service';
import { AdminFareService } from './services/admin-fare.service';
import { AdminAuthService } from './services/admin-auth.service';

@Module({
    imports: [AuthModule, UserModule, SharedModule, MulterModule.register(multerConfig)],
    providers: [AdminVehicleTypeService, AdminFareService, AdminAuthService],
    controllers: [
        AdminAuthController,
        AdminPasswordResetController,
        AdminVehicleTypeController,
        AdminFareController,
    ],
})
export class AdminModule {}