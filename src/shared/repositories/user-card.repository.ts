import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { UserCard, UserCardDocument } from '../schemas/user-card.schema';

@Injectable()
export class UserCardRepository extends BaseRepository<UserCardDocument> {
    constructor(@InjectModel(UserCard.name) protected readonly model: Model<UserCardDocument>) {
        super(model);
    }

    async listByUser(userId: string) {
        if (!Types.ObjectId.isValid(userId)) return [];
        return this.model.find({ userId: new Types.ObjectId(userId) } as any).sort({ createdAt: -1 }).exec();
    }

    async findOwnedByUser(cardId: string, userId: string) {
        if (!Types.ObjectId.isValid(cardId) || !Types.ObjectId.isValid(userId)) return null;
        return this.model.findOne({ _id: new Types.ObjectId(cardId), userId: new Types.ObjectId(userId) } as any).exec();
    }

    async setDefault(userId: string, cardId: string) {
        if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(cardId)) return;
        await this.model.updateMany({ userId: new Types.ObjectId(userId) } as any, { $set: { isDefault: false } }).exec();
        await this.model.updateOne({ _id: new Types.ObjectId(cardId), userId: new Types.ObjectId(userId) } as any, { $set: { isDefault: true } }).exec();
    }
}

