import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Ride, RideDocument } from '../schemas/ride.schema';

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
        const conditions: FilterQuery<RideDocument> = { userId };
        if (status?.trim()) {
            conditions.status = status.trim();
        }
        return this.paginate(page, limit, conditions, { sort: { createdAt: -1 } });
    }
}
