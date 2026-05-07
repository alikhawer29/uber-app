import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import {
    RiderVehicleUpdateRequest,
    RiderVehicleUpdateRequestDocument,
} from '../schemas/rider-vehicle-update-request.schema';
import { RiderVehicleUpdateRequestStatus } from '../../common/constants/rider.constants';

@Injectable()
export class RiderVehicleUpdateRequestRepository extends BaseRepository<RiderVehicleUpdateRequestDocument> {
    constructor(
        @InjectModel(RiderVehicleUpdateRequest.name)
        protected readonly model: Model<RiderVehicleUpdateRequestDocument>,
    ) {
        super(model);
    }

    async findPendingByUserId(userId: string): Promise<RiderVehicleUpdateRequestDocument | null> {
        return this.model
            .findOne({
                userId: new Types.ObjectId(userId),
                status: RiderVehicleUpdateRequestStatus.PENDING,
            })
            .exec();
    }

    async findByIdWithRelations(id: string): Promise<RiderVehicleUpdateRequestDocument | null> {
        if (!Types.ObjectId.isValid(id)) return null;
        return this.model
            .findById(id)
            .populate('userId', 'email firstName lastName phone status role createdAt')
            .populate('riderVehicleId')
            .populate('vehicleTypeId', 'name facilities image')
            .exec();
    }

    async paginateForAdmin(
        page: number,
        limit: number,
        tab: 'all' | 'pending' | 'approved' | 'rejected',
        search?: string,
    ): Promise<{
        data: RiderVehicleUpdateRequestDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const conditions: FilterQuery<RiderVehicleUpdateRequestDocument> = {};
        if (tab === 'pending') {
            conditions.status = RiderVehicleUpdateRequestStatus.PENDING;
        } else if (tab === 'rejected') {
            conditions.status = RiderVehicleUpdateRequestStatus.REJECTED;
        } else if (tab === 'approved') {
            conditions.status = RiderVehicleUpdateRequestStatus.APPROVED;
        }
        /* tab === 'all': no status filter */
        const q = search?.trim();
        if (q) {
            const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            conditions.riderSearchText = { $regex: safe, $options: 'i' };
        }
        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [
                { path: 'userId', select: 'email firstName lastName phone status role createdAt' },
                { path: 'riderVehicleId' },
                { path: 'vehicleTypeId', select: 'name facilities image' },
            ],
        });
    }

    async deleteAllForRiderVehicle(riderVehicleId: string): Promise<void> {
        if (!Types.ObjectId.isValid(riderVehicleId)) return;
        await this.model
            .deleteMany({ riderVehicleId: new Types.ObjectId(riderVehicleId) })
            .exec();
    }
}
