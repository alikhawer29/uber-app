import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PayoutSetting, PayoutSettingDocument } from '../schemas/payout-setting.schema';

@Injectable()
export class PayoutSettingRepository extends BaseRepository<PayoutSettingDocument> {
    constructor(
        @InjectModel(PayoutSetting.name) model: Model<PayoutSettingDocument>,
    ) {
        super(model);
    }

    async getLatest(): Promise<PayoutSettingDocument | null> {
        return this.model.findOne().sort({ createdAt: -1 }).exec();
    }

    async paginateHistory(page: number, limit: number, search?: string) {
        const conditions: FilterQuery<PayoutSettingDocument> = {};
        const trimmed = search?.trim();
        if (trimmed) {
            const num = Number(trimmed);
            if (!Number.isInteger(num) || num < 1) {
                conditions._id = null as any;
            } else {
                conditions.payoutDays = num;
            }
        }
        return this.paginate(page, limit, conditions, { sort: { createdAt: -1 } });
    }
}
