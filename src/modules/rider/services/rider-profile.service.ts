import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/services/user.service';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { buildDriverRatingSummary } from 'src/common/utils/driver-rating-display.util';
import { UpdateProfileDto } from 'src/modules/user/dto/update-profile.dto';

@Injectable()
export class RiderProfileService {
    constructor(
        private readonly userService: UserService,
        private readonly rideRepository: RideRepository,
    ) {}

    async getProfile(riderId: string) {
        const user = await this.userService.getProfile(riderId);
        const ratingStats = await this.rideRepository.aggregateDriverRatingSummary(riderId);
        return {
            ...user,
            ratings: buildDriverRatingSummary(ratingStats),
        };
    }

    async updateProfile(riderId: string, dto: UpdateProfileDto, avatar?: Express.Multer.File) {
        const user = await this.userService.updateProfile(riderId, dto, avatar);
        const ratingStats = await this.rideRepository.aggregateDriverRatingSummary(riderId);
        return {
            ...user,
            ratings: buildDriverRatingSummary(ratingStats),
        };
    }
}
