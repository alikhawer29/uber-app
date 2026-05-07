import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { RideRequest, RideRequestDocument, RideRequestStatus } from '../schemas/ride-request.schema';

@Injectable()
export class RideRequestRepository extends BaseRepository<RideRequestDocument> {
    constructor(
        @InjectModel(RideRequest.name) protected readonly model: Model<RideRequestDocument>,
    ) {
        super(model);
    }

    async findPendingForRider(rideId: string, riderId: string) {
        if (!Types.ObjectId.isValid(rideId) || !Types.ObjectId.isValid(riderId)) return null;
        return this.model
            .findOne({
                rideId: new Types.ObjectId(rideId),
                riderId: new Types.ObjectId(riderId),
                status: RideRequestStatus.PENDING,
            } as any)
            .exec();
    }

    async setStatus(id: string, status: RideRequestStatus, rejectReason?: string | null) {
        return this.update(id, { status, rejectReason: rejectReason ?? null } as any);
    }

    async cancelAllForRide(rideId: string) {
        if (!Types.ObjectId.isValid(rideId)) return { modifiedCount: 0 };
        const res = await this.model
            .updateMany(
                { rideId: new Types.ObjectId(rideId), status: RideRequestStatus.PENDING } as any,
                { $set: { status: RideRequestStatus.CANCELLED } },
            )
            .exec();
        return { modifiedCount: res.modifiedCount };
    }
}

