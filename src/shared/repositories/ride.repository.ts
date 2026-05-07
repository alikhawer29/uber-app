import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Ride, RideDocument } from '../schemas/ride.schema';
import { RideStatus } from 'src/common/constants/ride.constants';

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
}
