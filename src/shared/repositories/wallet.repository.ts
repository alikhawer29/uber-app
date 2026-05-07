import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Wallet, WalletDocument } from '../schemas/wallet.schema';

@Injectable()
export class WalletRepository extends BaseRepository<WalletDocument> {
    constructor(@InjectModel(Wallet.name) protected readonly model: Model<WalletDocument>) {
        super(model);
    }

    async getOrCreate(userId: string, currency: string = 'USD') {
        if (!Types.ObjectId.isValid(userId)) return null;
        const existing = await this.model.findOne({ userId: new Types.ObjectId(userId) } as any).exec();
        if (existing) return existing;
        return this.create({ userId: new Types.ObjectId(userId), balance: 0, currency } as any);
    }

    async incrementBalance(userId: string, amount: number) {
        if (!Types.ObjectId.isValid(userId)) return null;
        return this.model
            .findOneAndUpdate(
                { userId: new Types.ObjectId(userId) } as any,
                { $inc: { balance: amount } },
                { new: true, upsert: true },
            )
            .exec();
    }
}

