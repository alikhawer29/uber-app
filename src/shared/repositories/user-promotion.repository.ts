import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { UserPromotion, UserPromotionDocument } from '../schemas/user-promotion.schema';

@Injectable()
export class UserPromotionRepository extends BaseRepository<UserPromotionDocument> {
    constructor(
        @InjectModel(UserPromotion.name) protected readonly model: Model<UserPromotionDocument>,
    ) {
        super(model);
    }

    async findByUserId(userId: string) {
        if (!Types.ObjectId.isValid(userId)) return [];
        return this.model
            .find({ userId: new Types.ObjectId(userId) })
            .populate({ path: 'promoCodeId' })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByUserAndPromo(userId: string, promoId: string) {
        if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(promoId)) return null;
        return this.model
            .findOne({
                userId: new Types.ObjectId(userId),
                promoCodeId: new Types.ObjectId(promoId),
            })
            .exec();
    }

    async markUsedIfExists(userId: string, promoId: string) {
        if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(promoId)) return null;
        return this.model
            .findOneAndUpdate(
                {
                    userId: new Types.ObjectId(userId),
                    promoCodeId: new Types.ObjectId(promoId),
                },
                { $set: { isUsed: true, usedAt: new Date() } },
                { new: true },
            )
            .exec();
    }
}

