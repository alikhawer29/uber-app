import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { RideMessage, RideMessageDocument } from '../schemas/ride-message.schema';

@Injectable()
export class RideMessageRepository extends BaseRepository<RideMessageDocument> {
    constructor(
        @InjectModel(RideMessage.name) protected readonly model: Model<RideMessageDocument>,
    ) {
        super(model);
    }

    async listByRide(rideId: string) {
        if (!Types.ObjectId.isValid(rideId)) return [];
        return this.model
            .find({ rideId: new Types.ObjectId(rideId) } as any)
            .sort({ createdAt: 1 })
            .limit(500)
            .exec();
    }
}

