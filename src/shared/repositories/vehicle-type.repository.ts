import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { VehicleType, VehicleTypeDocument } from '../schemas/vehicle-type.schema';

@Injectable()
export class VehicleTypeRepository extends BaseRepository<VehicleTypeDocument> {
    constructor(
        @InjectModel(VehicleType.name) protected readonly model: Model<VehicleTypeDocument>,
    ) {
        super(model);
    }

    async findByName(name: string): Promise<VehicleTypeDocument | null> {
        return this.model
            .findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
            .exec();
    }

    async paginateActive(
        page: number,
        limit: number,
        search?: string,
    ): Promise<{
        data: VehicleTypeDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const conditions: FilterQuery<VehicleTypeDocument> = { isActive: true };
        if (search?.trim()) {
            conditions.$or = [
                { name: { $regex: search.trim(), $options: 'i' } },
                { facilities: { $regex: search.trim(), $options: 'i' } },
            ];
        }
        return this.paginate(page, limit, conditions, {
            sort: { sortOrder: 1, createdAt: -1 },
        });
    }

    async findActiveIdsMatchingSearch(search: string): Promise<Types.ObjectId[]> {
        const q = search.trim();
        if (!q) return [];
        const docs = await this.model
            .find({
                isActive: true,
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { facilities: { $regex: q, $options: 'i' } },
                ],
            })
            .select('_id')
            .exec();
        return docs.map((d) => d._id as Types.ObjectId);
    }
}
