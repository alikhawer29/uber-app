import { Injectable } from '@nestjs/common';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { buildDriverRatingSummary } from 'src/common/utils/driver-rating-display.util';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatReviewDate(d: Date): string {
    const day = String(d.getUTCDate()).padStart(2, '0');
    const mon = MONTHS[d.getUTCMonth()];
    const y = d.getUTCFullYear();
    return `${day}-${mon}-${y}`;
}

@Injectable()
export class RiderRatingsService {
    constructor(private readonly rideRepository: RideRepository) {}

    async getSummary(riderId: string) {
        const summary = await this.rideRepository.aggregateDriverRatingSummary(riderId);
        return {
            success: true,
            data: {
                ...buildDriverRatingSummary(summary),
                ratingStats: summary.ratingStats,
            },
        };
    }

    async getReviews(riderId: string, page: number, limit: number) {
        const result = await this.rideRepository.paginatePassengerReviewsForDriver(riderId, page, limit);
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
