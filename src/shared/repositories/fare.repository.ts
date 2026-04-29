import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Fare, FareDocument } from '../schemas/fare.schema';

@Injectable()
export class FareRepository extends BaseRepository<FareDocument> {
    constructor(
        @InjectModel(Fare.name) protected readonly model: Model<FareDocument>,
    ) {
        super(model);
    }

    async findByVehicleTypeId(vehicleTypeId: string): Promise<FareDocument | null> {
        if (!Types.ObjectId.isValid(vehicleTypeId)) return null;
        return this.model.findOne({ vehicleTypeId: new Types.ObjectId(vehicleTypeId) }).exec();
    }

    async findByIdWithVehicleType(id: string): Promise<FareDocument | null> {
        if (!Types.ObjectId.isValid(id)) return null;
        return this.model.findById(id).populate('vehicleTypeId').exec();
    }

    /** All active fares with vehicle type for ride booking quotes */
    async findAllActiveWithVehicleType(): Promise<FareDocument[]> {
        return this.model
            .find({ isActive: true })
            .populate('vehicleTypeId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async paginateWithVehicleType(
        page: number,
        limit: number,
        vehicleTypeIds?: Types.ObjectId[],
    ): Promise<{
        data: FareDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const conditions: FilterQuery<FareDocument> = { isActive: true };
        if (vehicleTypeIds !== undefined) {
            if (vehicleTypeIds.length === 0) {
                return {
                    data: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: page > 1,
                };
            }
            conditions.vehicleTypeId = { $in: vehicleTypeIds };
        }
        const skip = (page - 1) * limit;
        const sort = { createdAt: -1 as const };
        const [data, total] = await Promise.all([
            this.model
                .find(conditions)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('vehicleTypeId')
                .exec(),
            this.model.countDocuments(conditions).exec(),
        ]);
        const totalPages = Math.ceil(total / limit) || 0;
        return {
            data,
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        };
    }
}
