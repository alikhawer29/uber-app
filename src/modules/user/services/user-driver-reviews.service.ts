import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserRole } from 'src/common/constants/user.constants';
import { buildDriverRatingSummary } from 'src/common/utils/driver-rating-display.util';
import { mapPassengerReviewsFromRides } from 'src/common/utils/map-passenger-reviews.util';

@Injectable()
export class UserDriverReviewsService {
    constructor(
        private readonly rideRepository: RideRepository,
        private readonly userRepository: UserRepository,
    ) {}

    private async assertDriver(driverId: string) {
        if (!Types.ObjectId.isValid(driverId)) {
            throw new NotFoundException('Driver not found');
        }
        const driver = await this.userRepository.findById(driverId);
        if (!driver || String(driver.role) !== UserRole.RIDER) {
            throw new NotFoundException('Driver not found');
        }
        return driver;
    }

    async getSummary(driverId: string, page = 1, limit = 50) {
        await this.assertDriver(driverId);
        const summary = await this.rideRepository.aggregateDriverRatingSummary(driverId);
        const result = await this.rideRepository.paginatePassengerReviewsForDriver(driverId, page, limit);
        const reviews = mapPassengerReviewsFromRides(result.data);

        return {
            success: true,
            data: {
                driverId,
                ...buildDriverRatingSummary(summary),
                ratingStats: summary.ratingStats,
                reviews,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                },
            },
        };
    }

    async getReviews(driverId: string, page: number, limit: number) {
        return this.getSummary(driverId, page, limit);
    }
}
