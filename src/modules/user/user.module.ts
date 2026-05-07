import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';
import { RideModule } from '../ride/ride.module';
import { UserService } from './services/user.service';
import { UserAuthService } from './services/user-auth.service';
import { UserAuthController } from './controllers/user-auth.controller';
import { UserController } from './controllers/user.controller';
import { UserSavedPlaceController } from './controllers/user-saved-place.controller';
import { UserRideController } from './controllers/user-ride.controller';
import { UserCardsController } from './controllers/user-cards.controller';
import { UserWalletController } from './controllers/user-wallet.controller';
import { UserNotificationsController } from './controllers/user-notifications.controller';
import { UserSavedPlaceService } from './services/user-saved-place.service';
import { UserRideService } from './services/user-ride.service';
import { ContactUsService } from './services/contact-us.service';
import { UserPromotionsService } from './services/user-promotions.service';
import { UserCardsService } from './services/user-cards.service';
import { UserWalletService } from './services/user-wallet.service';
import { RideChatService } from './services/ride-chat.service';
import { RideComplaintRepository } from 'src/shared/repositories/ride-complaint.repository';
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
        RideModule,
        MulterModule.register(multerConfig),
    ],
    providers: [
        UserService,
        UserAuthService,
        UserSavedPlaceService,
        UserRideService,
        ContactUsService,
        UserPromotionsService,
        UserCardsService,
        UserWalletService,
        RideChatService,
        // imported via SharedModule, injected into UserRideService
    ],
    controllers: [
        UserAuthController,
        UserController,
        UserSavedPlaceController,
        UserRideController,
        UserPromotionsController,
        UserCardsController,
        UserWalletController,
        UserNotificationsController,
    ],
    exports: [UserAuthService, ContactUsService],
})
export class UserModule { }