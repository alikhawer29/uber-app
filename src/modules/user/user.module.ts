import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';
import { UserService } from './services/user.service';
import { UserAuthService } from './services/user-auth.service';
import { UserAuthController } from './controllers/user-auth.controller';
import { UserController } from './controllers/user.controller';
import { UserSavedPlaceController } from './controllers/user-saved-place.controller';
import { UserRideController } from './controllers/user-ride.controller';
import { UserSavedPlaceService } from './services/user-saved-place.service';
import { UserRideService } from './services/user-ride.service';
import { ContactUsService } from './services/contact-us.service';
import { UserPromotionsService } from './services/user-promotions.service';
import { SharedModule } from 'src/shared/shared.module';
import { multerConfig } from 'src/config/multer.config';
import { MulterModule } from '@nestjs/platform-express';
import { CommonModule } from 'src/common/common.module';
import { UserPromotionsController } from './controllers/user-promotions.controller';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        ConfigModule,
        JwtModule,
        NotificationModule,
        MulterModule.register(multerConfig),
    ],
    providers: [
        UserService,
        UserAuthService,
        UserSavedPlaceService,
        UserRideService,
        ContactUsService,
        UserPromotionsService,
    ],
    controllers: [
        UserAuthController,
        UserController,
        UserSavedPlaceController,
        UserRideController,
        UserPromotionsController,
    ],
    exports: [UserAuthService, ContactUsService],
})
export class UserModule { }