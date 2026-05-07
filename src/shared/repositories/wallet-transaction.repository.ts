import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { WalletTransaction, WalletTransactionDocument } from '../schemas/wallet-transaction.schema';

@Injectable()
export class WalletTransactionRepository extends BaseRepository<WalletTransactionDocument> {
    constructor(
        @InjectModel(WalletTransaction.name) protected readonly model: Model<WalletTransactionDocument>,
    ) {
        super(model);
    }

    async listByUser(userId: string, page: number, limit: number) {
        if (!Types.ObjectId.isValid(userId)) {
            return this.paginate(page, limit, { userId: new Types.ObjectId('000000000000000000000000') } as any);
        }
        return this.paginate(page, limit, { userId: new Types.ObjectId(userId) } as any, { sort: { createdAt: -1 } });
    }
}

