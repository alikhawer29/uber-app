import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
}

