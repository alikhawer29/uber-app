import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { CommissionRate, CommissionRateDocument } from '../schemas/commission-rate.schema';

@Injectable()
export class CommissionRateRepository extends BaseRepository<CommissionRateDocument> {
    constructor(
        @InjectModel(CommissionRate.name) model: Model<CommissionRateDocument>,
    ) {
        super(model);
    }

    async getLatest(): Promise<CommissionRateDocument | null> {
        return this.model.findOne().sort({ createdAt: -1 }).exec();
    }

    async paginateHistory(page: number, limit: number, search?: string) {
        const conditions: FilterQuery<CommissionRateDocument> = {};
        const trimmed = search?.trim();
        if (trimmed) {
            const num = Number(trimmed.replace('%', ''));
            if (!Number.isNaN(num)) {
                conditions.percentage = num;
            }
        }
        return this.paginate(page, limit, conditions, { sort: { createdAt: -1 } });
    }
}
