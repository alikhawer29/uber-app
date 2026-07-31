import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { RiderVehicle, RiderVehicleDocument } from '../schemas/rider-vehicle.schema';
import { RiderVehicleApprovalStatus } from '../../common/constants/rider.constants';

@Injectable()
export class RiderVehicleRepository extends BaseRepository<RiderVehicleDocument> {
    constructor(
        @InjectModel(RiderVehicle.name) protected readonly model: Model<RiderVehicleDocument>,
    ) {
        super(model);
    }

    async findByUserId(userId: string): Promise<RiderVehicleDocument | null> {
        return this.model.findOne({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).exec();
    }

    async findLatestByUserIdWithVehicleType(userId: string): Promise<RiderVehicleDocument | null> {
        if (!Types.ObjectId.isValid(userId)) return null;
        return this.model
            .findOne({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .populate('vehicleTypeId', 'name facilities image')
            .exec();
    }

    async findLatestApprovedByUserIdWithVehicleType(userId: string): Promise<RiderVehicleDocument | null> {
        if (!Types.ObjectId.isValid(userId)) return null;
        return this.model
            .findOne({
                userId: new Types.ObjectId(userId),
                approvalStatus: RiderVehicleApprovalStatus.APPROVED,
            })
            .sort({ createdAt: -1 })
            .populate('vehicleTypeId', 'name facilities image')
            .exec();
    }

    /** Approved vehicle for a rider that matches the requested ride vehicle type. */
    async findApprovedByUserIdAndVehicleType(
        userId: string,
        vehicleTypeId: string,
    ): Promise<RiderVehicleDocument | null> {
        if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(vehicleTypeId)) return null;
        return this.model
            .findOne({
                userId: new Types.ObjectId(userId),
                vehicleTypeId: new Types.ObjectId(vehicleTypeId),
                approvalStatus: RiderVehicleApprovalStatus.APPROVED,
            })
            .sort({ createdAt: -1 })
            .populate('vehicleTypeId', 'name facilities image')
            .exec();
    }

    async paginateByApprovalStatus(
        page: number,
        limit: number,
        approvalStatus: RiderVehicleApprovalStatus,
    ): Promise<{
        data: RiderVehicleDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const conditions: FilterQuery<RiderVehicleDocument> = { approvalStatus };
        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [
                { path: 'userId', select: 'email firstName lastName phone status role createdAt' },
                { path: 'vehicleTypeId', select: 'name facilities image' },
            ],
        });
    }

    async findByIdWithRelations(id: string): Promise<RiderVehicleDocument | null> {
        if (!Types.ObjectId.isValid(id)) return null;
        return this.model
            .findById(id)
            .populate('userId', 'email firstName lastName phone status role createdAt')
            .populate('vehicleTypeId', 'name facilities image')
            .exec();
    }

    async rejectAllPendingForUser(userId: string, reason?: string): Promise<void> {
        await this.model
            .updateMany(
                {
                    userId: new Types.ObjectId(userId),
                    approvalStatus: RiderVehicleApprovalStatus.PENDING,
                },
                {
                    $set: {
                        approvalStatus: RiderVehicleApprovalStatus.REJECTED,
                        ...(reason ? { rejectionReason: reason } : {}),
                    },
                },
            )
            .exec();
    }

    async approveAllPendingForUser(userId: string): Promise<void> {
        await this.model
            .updateMany(
                {
                    userId: new Types.ObjectId(userId),
                    approvalStatus: RiderVehicleApprovalStatus.PENDING,
                },
                {
                    $set: {
                        approvalStatus: RiderVehicleApprovalStatus.APPROVED,
                        rejectionReason: null,
                    },
                },
            )
            .exec();
    }

    /** Deletes one vehicle row only if it belongs to the rider. */
    async deleteOneOwnedByUser(vehicleId: string, userId: string): Promise<boolean> {
        if (!Types.ObjectId.isValid(vehicleId) || !Types.ObjectId.isValid(userId)) return false;
        const res = await this.model
            .deleteOne({
                _id: new Types.ObjectId(vehicleId),
                userId: new Types.ObjectId(userId),
            })
            .exec();
        return res.deletedCount === 1;
    }

    /** Most recently created vehicle for this user (any approval status). */
    async findLatestIdForUser(userId: string): Promise<string | null> {
        if (!Types.ObjectId.isValid(userId)) return null;
        const doc = await this.model
            .findOne({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .select('_id')
            .lean()
            .exec();
        return doc?._id ? String(doc._id) : null;
    }
}
