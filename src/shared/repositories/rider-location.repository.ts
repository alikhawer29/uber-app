import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { RiderLocation, RiderLocationDocument } from '../schemas/rider-location.schema';

@Injectable()
export class RiderLocationRepository extends BaseRepository<RiderLocationDocument> {
    constructor(
        @InjectModel(RiderLocation.name) protected readonly model: Model<RiderLocationDocument>,
    ) {
        super(model);
    }

    async upsertLocation(params: {
        riderId: string;
        latitude: number;
        longitude: number;
        heading?: number;
        speed?: number;
        isOnline: boolean;
    }) {
        if (!Types.ObjectId.isValid(params.riderId)) return null;
        return this.model
            .findOneAndUpdate(
                { riderId: new Types.ObjectId(params.riderId) },
                {
                    $set: {
                        riderId: new Types.ObjectId(params.riderId),
                        location: { type: 'Point', coordinates: [params.longitude, params.latitude] },
                        heading: params.heading ?? null,
                        speed: params.speed ?? null,
                        isOnline: params.isOnline,
                    },
                },
                { new: true, upsert: true },
            )
            .exec();
    }

    /**
     * Toggle online/offline without changing coordinates. Fails if the rider has never sent a location.
     */
    async setIsOnline(riderId: string, isOnline: boolean): Promise<RiderLocationDocument | null> {
        if (!Types.ObjectId.isValid(riderId)) return null;
        return this.model
            .findOneAndUpdate(
                { riderId: new Types.ObjectId(riderId) },
                { $set: { isOnline } },
                { new: true },
            )
            .exec();
    }

    async findOnlineRidersWithinKm(params: { latitude: number; longitude: number; radiusKm: number }) {
        const radiusRadians = params.radiusKm / 6378.1;
        return this.model
            .find({
                isOnline: true,
                location: {
                    $geoWithin: {
                        $centerSphere: [[params.longitude, params.latitude], radiusRadians],
                    },
                },
            } as any)
            .sort({ updatedAt: -1 })
            .limit(50)
            .exec();
    }
}

