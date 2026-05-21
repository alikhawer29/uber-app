import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserRole } from 'src/common/constants/user.constants';
import { buildDriverRatingSummary } from 'src/common/utils/driver-rating-display.util';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatReviewDate(d: Date): string {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const mon = MONTHS[d.getUTCMonth()];
    const y = d.getUTCFullYear();
    return `${day}-${mon}-${y}`;
}

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

    async getSummary(driverId: string) {
        await this.assertDriver(driverId);
        const summary = await this.rideRepository.aggregateDriverRatingSummary(driverId);
        return {
            success: true,
            data: {
                driverId,
                ...buildDriverRatingSummary(summary),
                ratingStats: summary.ratingStats,
            },
        };
    }

    async getReviews(driverId: string, page: number, limit: number) {
        await this.assertDriver(driverId);
        const summary = await this.rideRepository.aggregateDriverRatingSummary(driverId);
        const result = await this.rideRepository.paginatePassengerReviewsForDriver(driverId, page, limit);
        const reviews = result.data.map((ride: any) => {
            const u = ride.userId;
            const name =
                u && typeof u === 'object'
                    ? `${(u.firstName || '').trim()} ${(u.lastName || '').trim()}`.trim() || 'Passenger'
                    : 'Passenger';
            const reviewerImage = u && typeof u === 'object' ? u.avatar || null : null;
            const createdAt = ride.updatedAt || ride.createdAt;
            return {
                rideId: String(ride._id),
                reviewerName: name,
                reviewerImage,
                rating: ride.ratingByUser,
                comment: ride.reviewByUser ?? '',
                reviewDate: formatReviewDate(new Date(createdAt)),
                createdAt: new Date(createdAt).toISOString(),
            };
        });

        return {
            success: true,
            data: {
                driverId,
                summary: buildDriverRatingSummary(summary),
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
}
