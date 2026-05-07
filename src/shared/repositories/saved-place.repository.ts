import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { SavedPlace, SavedPlaceDocument } from '../schemas/saved-place.schema';

@Injectable()
export class SavedPlaceRepository extends BaseRepository<SavedPlaceDocument> {
    constructor(
        @InjectModel(SavedPlace.name) protected readonly model: Model<SavedPlaceDocument>,
    ) {
        super(model);
    }

    async listForUser(userId: string, search?: string): Promise<SavedPlaceDocument[]> {
        const conditions: FilterQuery<SavedPlaceDocument> = {
            userId: new Types.ObjectId(userId),
            isActive: true,
        };
        const q = search?.trim();
        if (q) {
            const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            conditions.$or = [
                { name: { $regex: safe, $options: 'i' } },
                { formattedAddress: { $regex: safe, $options: 'i' } },
            ];
        }
        return this.model.find(conditions).sort({ sortOrder: 1, createdAt: -1 }).exec();
    }

    async findOwnedByUser(placeId: string, userId: string): Promise<SavedPlaceDocument | null> {
        if (!Types.ObjectId.isValid(placeId)) return null;
        return this.model
            .findOne({
                _id: new Types.ObjectId(placeId),
                userId: new Types.ObjectId(userId),
            })
            .exec();
    }

    /** Permanently deletes the document when it belongs to the user (single round-trip). */
    async deleteOwnedByUser(placeId: string, userId: string): Promise<boolean> {
        if (!Types.ObjectId.isValid(placeId)) return false;
        const result = await this.model
            .findOneAndDelete({
                _id: new Types.ObjectId(placeId),
                userId: new Types.ObjectId(userId),
            })
            .exec();
        return result !== null;
    }
}
