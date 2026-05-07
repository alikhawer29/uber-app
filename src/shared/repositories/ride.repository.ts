import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Ride, RideDocument } from '../schemas/ride.schema';
import { RideStatus } from 'src/common/constants/ride.constants';

export type DriverRatingStats = {
    averageRating: number;
    totalReviews: number;
    /** Count per star 1–5 */
    ratingStats: { 1: number; 2: number; 3: number; 4: number; 5: number };
};

@Injectable()
export class RideRepository extends BaseRepository<RideDocument> {
    constructor(@InjectModel(Ride.name) protected readonly model: Model<RideDocument>) {
        super(model);
    }

    async findByUserId(
        userId: string,
        page: number,
        limit: number,
        status?: string,
    ): Promise<{
        data: RideDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const conditions: FilterQuery<RideDocument> = { userId: new Types.ObjectId(userId) as any };
        if (status?.trim()) {
            conditions.status = status.trim();
        }
        return this.paginate(page, limit, conditions, { sort: { createdAt: -1 } });
    }

    async findActiveForUser(userId: string): Promise<RideDocument | null> {
        if (!Types.ObjectId.isValid(userId)) return null;
        return this.model
            .findOne({
                userId: new Types.ObjectId(userId),
                status: {
                    $in: [
                        RideStatus.SEARCHING,
                        RideStatus.ACCEPTED,
                        RideStatus.ARRIVED,
                        RideStatus.IN_PROGRESS,
                        RideStatus.PENDING, // legacy
                        RideStatus.ONGOING, // legacy
                    ],
                },
            } as any)
            .sort({ createdAt: -1 })
            .exec();
    }

    async findOwnedByUser(rideId: string, userId: string): Promise<RideDocument | null> {
        if (!Types.ObjectId.isValid(rideId) || !Types.ObjectId.isValid(userId)) return null;
        return this.model
            .findOne({ _id: new Types.ObjectId(rideId), userId: new Types.ObjectId(userId) } as any)
            .exec();
    }

    async aggregateDriverRatingSummary(driverId: string): Promise<DriverRatingStats> {
        const empty: DriverRatingStats = {
            averageRating: 0,
            totalReviews: 0,
            ratingStats: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
        if (!Types.ObjectId.isValid(driverId)) return empty;

        const oid = new Types.ObjectId(driverId);
        const baseMatch = {
            driverId: oid,
            ratingByUser: { $gte: 1, $lte: 5 },
            status: RideStatus.COMPLETED,
        } as const;

        const [agg] = await this.model
            .aggregate<{ _id: null; avg: number; count: number }>([
                { $match: baseMatch },
                { $group: { _id: null, avg: { $avg: '$ratingByUser' }, count: { $sum: 1 } } },
            ])
            .exec();

        const hist = await this.model
            .aggregate<{ _id: number; c: number }>([
                { $match: baseMatch },
                { $group: { _id: '$ratingByUser', c: { $sum: 1 } } },
            ])
            .exec();

        const ratingStats = { ...empty.ratingStats };
        for (const row of hist) {
            const star = Math.round(row._id) as 1 | 2 | 3 | 4 | 5;
            if (star >= 1 && star <= 5) ratingStats[star] = row.c;
        }

        return {
            averageRating: agg?.count ? Math.round(agg.avg * 10) / 10 : 0,
            totalReviews: agg?.count ?? 0,
            ratingStats,
        };
    }

    async paginatePassengerReviewsForDriver(driverId: string, page: number, limit: number) {
        if (!Types.ObjectId.isValid(driverId)) {
            return this.paginate(page, limit, { _id: new Types.ObjectId('000000000000000000000000') } as any);
        }
        return this.paginate(
            page,
            limit,
            {
                driverId: new Types.ObjectId(driverId),
                ratingByUser: { $gte: 1, $lte: 5 },
                status: RideStatus.COMPLETED,
            } as any,
            {
                sort: { updatedAt: -1 },
                populate: [{ path: 'userId', select: 'firstName lastName avatar' }],
            },
        );
    }
}
