import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ReportStatus } from 'src/common/constants/admin.constants';
import { BaseRepository } from './base.repository';
import { RideComplaint, RideComplaintDocument } from '../schemas/ride-complaint.schema';

@Injectable()
export class RideComplaintRepository extends BaseRepository<RideComplaintDocument> {
    constructor(
        @InjectModel(RideComplaint.name) protected readonly model: Model<RideComplaintDocument>,
    ) {
        super(model);
    }

    async existsForRideAndUser(rideId: string, userId: string) {
        if (!Types.ObjectId.isValid(rideId) || !Types.ObjectId.isValid(userId)) return false;
        const count = await this.model
            .countDocuments({ rideId: new Types.ObjectId(rideId), userId: new Types.ObjectId(userId) } as any)
            .exec();
        return count > 0;
    }

    async paginateAdmin(
        page: number,
        limit: number,
        options?: {
            search?: string;
            status?: ReportStatus;
            fromDate?: string;
            toDate?: string;
            userIds?: Types.ObjectId[];
            rideIds?: Types.ObjectId[];
        },
    ) {
        const conditions: FilterQuery<RideComplaintDocument> = {};

        if (options?.status) {
            conditions.status = options.status;
        }
        if (options?.fromDate || options?.toDate) {
            conditions.createdAt = {};
            if (options.fromDate) {
                (conditions.createdAt as any).$gte = new Date(options.fromDate);
            }
            if (options.toDate) {
                const end = new Date(options.toDate);
                end.setHours(23, 59, 59, 999);
                (conditions.createdAt as any).$lte = end;
            }
        }

        const search = options?.search?.trim();
        const or: FilterQuery<RideComplaintDocument>[] = [];
        if (search) {
            const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            or.push({ message: rx });
            if (options?.userIds?.length) {
                or.push({ userId: { $in: options.userIds } });
            }
            if (options?.rideIds?.length) {
                or.push({ rideId: { $in: options.rideIds } });
            }
            if (Types.ObjectId.isValid(search)) {
                or.push({ _id: new Types.ObjectId(search) });
                or.push({ rideId: new Types.ObjectId(search) });
            }
        }
        if (or.length) {
            conditions.$or = or;
        }

        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [
                { path: 'userId', select: 'firstName lastName email phone countryCode avatar' },
                { path: 'rideId', select: 'pickupAddress dropAddress startTime totalAmount status driverId userId paymentType' },
            ],
        });
    }
}

