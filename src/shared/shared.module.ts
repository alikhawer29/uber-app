import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { File, FileSchema } from './schemas/file.schema';
import { UserRepository } from './repositories/user.repository';
import { FileRepository } from './repositories/file.repository';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationRepository } from './repositories/notification.repository';
import { PasswordReset, PasswordResetSchema } from './schemas/password-reset.schema';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { VehicleType, VehicleTypeSchema } from './schemas/vehicle-type.schema';
import { Fare, FareSchema } from './schemas/fare.schema';
import { VehicleTypeRepository } from './repositories/vehicle-type.repository';
import { FareRepository } from './repositories/fare.repository';
import { SavedPlace, SavedPlaceSchema } from './schemas/saved-place.schema';
import { SavedPlaceRepository } from './repositories/saved-place.repository';
import { RiderVehicle, RiderVehicleSchema } from './schemas/rider-vehicle.schema';
import { RiderVehicleRepository } from './repositories/rider-vehicle.repository';
import {
    RiderVehicleUpdateRequest,
    RiderVehicleUpdateRequestSchema,
} from './schemas/rider-vehicle-update-request.schema';
import { RiderVehicleUpdateRequestRepository } from './repositories/rider-vehicle-update-request.repository';
import { Ride, RideSchema } from './schemas/ride.schema';
import { PromoCode, PromoCodeSchema } from './schemas/promo-code.schema';
import { RideRepository } from './repositories/ride.repository';
import { PromoCodeRepository } from './repositories/promo-code.repository';
import { ContactUsSubmission, ContactUsSubmissionSchema } from './schemas/contact-us-submission.schema';
import { ContactUsSubmissionRepository } from './repositories/contact-us-submission.repository';
import { UserPromotion, UserPromotionSchema } from './schemas/user-promotion.schema';
import { UserPromotionRepository } from './repositories/user-promotion.repository';
import { RiderLocation, RiderLocationSchema } from './schemas/rider-location.schema';
import { RiderLocationRepository } from './repositories/rider-location.repository';
import { RideRequest, RideRequestSchema } from './schemas/ride-request.schema';
import { RideRequestRepository } from './repositories/ride-request.repository';
import { RideMessage, RideMessageSchema } from './schemas/ride-message.schema';
import { RideMessageRepository } from './repositories/ride-message.repository';
import { RideComplaint, RideComplaintSchema } from './schemas/ride-complaint.schema';
import { RideComplaintRepository } from './repositories/ride-complaint.repository';
import { UserCard, UserCardSchema } from './schemas/user-card.schema';
import { UserCardRepository } from './repositories/user-card.repository';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletTransaction, WalletTransactionSchema } from './schemas/wallet-transaction.schema';
import { WalletTransactionRepository } from './repositories/wallet-transaction.repository';
import { CommissionRate, CommissionRateSchema } from './schemas/commission-rate.schema';
import { CommissionRateRepository } from './repositories/commission-rate.repository';
import { PayoutSetting, PayoutSettingSchema } from './schemas/payout-setting.schema';
import { PayoutSettingRepository } from './repositories/payout-setting.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: File.name, schema: FileSchema },
            { name: Notification.name, schema: NotificationSchema },
            { name: PasswordReset.name, schema: PasswordResetSchema },
            { name: VehicleType.name, schema: VehicleTypeSchema },
            { name: Fare.name, schema: FareSchema },
            { name: SavedPlace.name, schema: SavedPlaceSchema },
            { name: RiderVehicle.name, schema: RiderVehicleSchema },
            { name: RiderVehicleUpdateRequest.name, schema: RiderVehicleUpdateRequestSchema },
            { name: Ride.name, schema: RideSchema },
            { name: PromoCode.name, schema: PromoCodeSchema },
            { name: ContactUsSubmission.name, schema: ContactUsSubmissionSchema },
            { name: UserPromotion.name, schema: UserPromotionSchema },
            { name: RiderLocation.name, schema: RiderLocationSchema },
            { name: RideRequest.name, schema: RideRequestSchema },
            { name: RideMessage.name, schema: RideMessageSchema },
            { name: RideComplaint.name, schema: RideComplaintSchema },
            { name: UserCard.name, schema: UserCardSchema },
            { name: Wallet.name, schema: WalletSchema },
            { name: WalletTransaction.name, schema: WalletTransactionSchema },
            { name: CommissionRate.name, schema: CommissionRateSchema },
            { name: PayoutSetting.name, schema: PayoutSettingSchema },
        ]),
    ],
    providers: [
        UserRepository,
        FileRepository,
        NotificationRepository,
        PasswordResetRepository,
        VehicleTypeRepository,
        FareRepository,
        SavedPlaceRepository,
        RiderVehicleRepository,
        RiderVehicleUpdateRequestRepository,
        RideRepository,
        PromoCodeRepository,
        ContactUsSubmissionRepository,
        UserPromotionRepository,
        RiderLocationRepository,
        RideRequestRepository,
        RideMessageRepository,
        RideComplaintRepository,
        UserCardRepository,
        WalletRepository,
        WalletTransactionRepository,
        CommissionRateRepository,
        PayoutSettingRepository,
    ],
    exports: [
        MongooseModule,
        UserRepository,
        FileRepository,
        NotificationRepository,
        PasswordResetRepository,
        VehicleTypeRepository,
        FareRepository,
        SavedPlaceRepository,
        RiderVehicleRepository,
        RiderVehicleUpdateRequestRepository,
        RideRepository,
        PromoCodeRepository,
        ContactUsSubmissionRepository,
        UserPromotionRepository,
        RiderLocationRepository,
        RideRequestRepository,
        RideMessageRepository,
        RideComplaintRepository,
        UserCardRepository,
        WalletRepository,
        WalletTransactionRepository,
        CommissionRateRepository,
        PayoutSettingRepository,
    ],
})
export class SharedModule { }