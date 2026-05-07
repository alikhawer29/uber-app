import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { SharedModule } from 'src/shared/shared.module';
import { multerConfig } from 'src/config/multer.config';
import { AdminVehicleTypeController } from './controllers/admin-vehicle-type.controller';
import { AdminFareController } from './controllers/admin-fare.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminPasswordResetController } from './controllers/admin-password-reset.controller';
import { AdminVehicleTypeService } from './services/admin-vehicle-type.service';
import { AdminFareService } from './services/admin-fare.service';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminRiderApprovalService } from './services/admin-rider-approval.service';
import { AdminPendingRidersController } from './controllers/admin-pending-riders.controller';
import { AdminPendingVehiclesController } from './controllers/admin-pending-vehicles.controller';
import { AdminDriversController } from './controllers/admin-drivers.controller';
import { AdminDriversService } from './services/admin-drivers.service';
import { AdminDriverRegistrationController } from './controllers/admin-driver-registration.controller';
import { AdminDriverRegistrationService } from './services/admin-driver-registration.service';
import { AdminVehicleUpdateRequestsController } from './controllers/admin-vehicle-update-requests.controller';
import { AdminVehicleUpdateRequestService } from './services/admin-vehicle-update-request.service';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminUsersService } from './services/admin-users.service';
import { AdminContactUsController } from './controllers/admin-contact-us.controller';
import { AdminContactUsService } from './services/admin-contact-us.service';
import { AdminPromotionsController } from './controllers/admin-promotions.controller';
import { AdminPromotionsService } from './services/admin-promotions.service';

@Module({
    imports: [
        AuthModule,
        UserModule,
        SharedModule,
        NotificationModule,
        MulterModule.register(multerConfig),
    ],
    providers: [
        AdminVehicleTypeService,
        AdminFareService,
        AdminAuthService,
        AdminRiderApprovalService,
        AdminDriversService,
        AdminDriverRegistrationService,
        AdminVehicleUpdateRequestService,
        AdminUsersService,
        AdminContactUsService,
        AdminPromotionsService,
    ],
    controllers: [
        AdminAuthController,
        AdminPasswordResetController,
        AdminVehicleTypeController,
        AdminFareController,
        AdminPendingRidersController,
        AdminPendingVehiclesController,
        AdminDriversController,
        AdminDriverRegistrationController,
        AdminVehicleUpdateRequestsController,
        AdminUsersController,
        AdminContactUsController,
        AdminPromotionsController,
    ],
})
export class AdminModule {}