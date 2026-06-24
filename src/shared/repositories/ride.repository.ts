import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AdminBookingStatusFilter, RevenueGraphPeriod } from 'src/common/constants/admin.constants';
import { RidePaymentStatus, RideCancelledBy, RideStatus } from 'src/common/constants/ride.constants';
import { buildAdminBookingStatusFilter } from 'src/common/utils/ride-display-status.util';
import { BaseRepository } from './base.repository';
import { Ride, RideDocument } from '../schemas/ride.schema';

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

    /**
     * Auto-cancel `searching` rides older than maxAgeMs (no driver assigned).
     */
    async expireStaleSearchingRidesForUser(userId: string, maxAgeMs: number): Promise<number> {
        if (!Types.ObjectId.isValid(userId) || maxAgeMs <= 0) return 0;
        const cutoff = new Date(Date.now() - maxAgeMs);
        const res = await this.model
            .updateMany(
                {
                    userId: new Types.ObjectId(userId),
                    status: RideStatus.SEARCHING,
                    createdAt: { $lt: cutoff },
                } as any,
                {
                    $set: {
                        status: RideStatus.CANCELLED,
                        cancelledBy: RideCancelledBy.USER,
                        cancelReason: 'no_driver_found',
                    },
                },
            )
            .exec();
        return res.modifiedCount ?? 0;
    }

    /**
     * Cancel other open bookings when the user starts a new one.
     */
    async closeSupersededUserRides(userId: string, exceptRideId?: string): Promise<number> {
        if (!Types.ObjectId.isValid(userId)) return 0;
        const conditions: FilterQuery<RideDocument> = {
            userId: new Types.ObjectId(userId) as any,
            status: {
                $in: [RideStatus.SEARCHING, RideStatus.SCHEDULED, RideStatus.PENDING],
            },
        };
        if (exceptRideId && Types.ObjectId.isValid(exceptRideId)) {
            conditions._id = { $ne: new Types.ObjectId(exceptRideId) } as any;
        }
        const res = await this.model
            .updateMany(conditions as any, {
                $set: {
                    status: RideStatus.CANCELLED,
                    cancelledBy: RideCancelledBy.USER,
                    cancelReason: 'superseded_by_new_booking',
                },
            })
            .exec();
        return res.modifiedCount ?? 0;
    }

    /**
     * Returns the user's current meaningful active ride (excludes stale searching).
     */
    async findActiveForUser(userId: string, searchingMaxAgeMs = 30 * 60_000): Promise<RideDocument | null> {
        if (!Types.ObjectId.isValid(userId)) return null;
        const oid = new Types.ObjectId(userId);
        const searchingCutoff = new Date(Date.now() - searchingMaxAgeMs);

        const inTripStatuses = [
            RideStatus.IN_PROGRESS,
            RideStatus.ONGOING,
            RideStatus.ARRIVED,
            RideStatus.ACCEPTED,
        ];

        let ride = await this.model
            .findOne({ userId: oid, status: { $in: inTripStatuses } } as any)
            .sort({ updatedAt: -1 })
            .exec();
        if (ride) return ride;

        ride = await this.model
            .findOne({
                userId: oid,
                status: RideStatus.SCHEDULED,
                startTime: { $gte: new Date() },
            } as any)
            .sort({ startTime: 1 })
            .exec();
        if (ride) return ride;

        ride = await this.model
            .findOne({
                userId: oid,
                status: RideStatus.SEARCHING,
                createdAt: { $gte: searchingCutoff },
            } as any)
            .sort({ createdAt: -1 })
            .exec();
        if (ride) return ride;

        return this.model
            .findOne({
                userId: oid,
                status: RideStatus.PENDING,
                createdAt: { $gte: searchingCutoff },
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

    /** Batch rating summaries for many drivers (e.g. ride list pages). */
    async aggregateDriverRatingSummaries(driverIds: string[]): Promise<Map<string, DriverRatingStats>> {
        const empty: DriverRatingStats = {
            averageRating: 0,
            totalReviews: 0,
            ratingStats: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
        const unique = [...new Set(driverIds.filter((id) => Types.ObjectId.isValid(id)))];
        const result = new Map<string, DriverRatingStats>();
        for (const id of unique) {
            result.set(id, { ...empty, ratingStats: { ...empty.ratingStats } });
        }
        if (!unique.length) return result;

        const oids = unique.map((id) => new Types.ObjectId(id));
        const baseMatch = {
            driverId: { $in: oids },
            ratingByUser: { $gte: 1, $lte: 5 },
            status: RideStatus.COMPLETED,
        } as const;

        const aggs = await this.model
            .aggregate<{ _id: Types.ObjectId; avg: number; count: number }>([
                { $match: baseMatch },
                { $group: { _id: '$driverId', avg: { $avg: '$ratingByUser' }, count: { $sum: 1 } } },
            ])
            .exec();

        const hist = await this.model
            .aggregate<{ _id: { driverId: Types.ObjectId; star: number }; c: number }>([
                { $match: baseMatch },
                { $group: { _id: { driverId: '$driverId', star: '$ratingByUser' }, c: { $sum: 1 } } },
            ])
            .exec();

        for (const row of aggs) {
            const id = String(row._id);
            const stats = result.get(id) ?? { ...empty, ratingStats: { ...empty.ratingStats } };
            stats.averageRating = row.count ? Math.round(row.avg * 10) / 10 : 0;
            stats.totalReviews = row.count ?? 0;
            result.set(id, stats);
        }
        for (const row of hist) {
            const id = String(row._id.driverId);
            const stats = result.get(id);
            if (!stats) continue;
            const star = Math.round(row._id.star) as 1 | 2 | 3 | 4 | 5;
            if (star >= 1 && star <= 5) stats.ratingStats[star] = row.c;
        }
        return result;
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

    async paginateAdmin(
        page: number,
        limit: number,
        options?: {
            search?: string;
            status?: AdminBookingStatusFilter;
            fromDate?: string;
            toDate?: string;
            userIds?: Types.ObjectId[];
            driverIds?: Types.ObjectId[];
        },
    ) {
        const conditions: FilterQuery<RideDocument> = {};

        const statusFilter = buildAdminBookingStatusFilter(options?.status);
        if (statusFilter) {
            Object.assign(conditions, statusFilter);
        }

        if (options?.fromDate || options?.toDate) {
            conditions.startTime = {};
            if (options.fromDate) {
                (conditions.startTime as any).$gte = new Date(options.fromDate);
            }
            if (options.toDate) {
                const end = new Date(options.toDate);
                end.setHours(23, 59, 59, 999);
                (conditions.startTime as any).$lte = end;
            }
        }

        const search = options?.search?.trim();
        const or: FilterQuery<RideDocument>[] = [];
        if (search) {
            const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            or.push({ pickupAddress: rx }, { dropAddress: rx }, { rideType: rx });
            if (options?.userIds?.length) {
                or.push({ userId: { $in: options.userIds } });
            }
            if (options?.driverIds?.length) {
                or.push({ driverId: { $in: options.driverIds } });
            }
            if (Types.ObjectId.isValid(search)) {
                or.push({ _id: new Types.ObjectId(search) });
            }
        }
        if (or.length) {
            conditions.$or = or;
        }

        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [
                { path: 'userId', select: 'firstName lastName email avatar' },
                { path: 'driverId', select: 'firstName lastName email phone countryCode avatar' },
            ],
        });
    }

    async countCompletedPaidRevenue(): Promise<number> {
        const [row] = await this.model
            .aggregate<{ total: number }>([
                {
                    $match: {
                        status: RideStatus.COMPLETED,
                        paymentStatus: RidePaymentStatus.PAID,
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ])
            .exec();
        return row?.total ?? 0;
    }

    async countByStatus(status: RideStatus): Promise<number> {
        return this.count({ status } as any);
    }

    async countAllBookings(): Promise<number> {
        return this.count({});
    }

    async aggregateRevenueGraph(period: RevenueGraphPeriod) {
        const now = new Date();
        let start: Date;
        let groupFormat: string;
        let bucketCount: number;

        switch (period) {
            case RevenueGraphPeriod.SIX_MONTHS:
                start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                groupFormat = '%Y-%m';
                bucketCount = 6;
                break;
            case RevenueGraphPeriod.YEARLY:
                start = new Date(now.getFullYear() - 11, now.getMonth(), 1);
                groupFormat = '%Y-%m';
                bucketCount = 12;
                break;
            case RevenueGraphPeriod.MONTHLY:
            default:
                start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                groupFormat = '%Y-%m';
                bucketCount = 12;
                break;
        }

        const rows = await this.model
            .aggregate<{ _id: string; revenue: number; bookings: number }>([
                {
                    $match: {
                        status: RideStatus.COMPLETED,
                        paymentStatus: RidePaymentStatus.PAID,
                        startTime: { $gte: start },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: groupFormat, date: '$startTime' } },
                        revenue: { $sum: '$totalAmount' },
                        bookings: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ])
            .exec();

        const map = new Map(rows.map((r) => [r._id, r]));
        const points: { label: string; period: string; revenue: number; bookings: number }[] = [];

        for (let i = bucketCount - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const row = map.get(key);
            const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            points.push({
                label,
                period: key,
                revenue: row?.revenue ?? 0,
                bookings: row?.bookings ?? 0,
            });
        }

        return points;
    }

    async countDriverCompletedTrips(driverId: string): Promise<number> {
        if (!Types.ObjectId.isValid(driverId)) return 0;
        return this.count({
            driverId: new Types.ObjectId(driverId),
            status: RideStatus.COMPLETED,
        } as any);
    }
}
