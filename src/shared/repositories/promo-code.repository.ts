import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PromoCode, PromoCodeDocument } from '../schemas/promo-code.schema';

@Injectable()
export class PromoCodeRepository extends BaseRepository<PromoCodeDocument> {
    constructor(@InjectModel(PromoCode.name) protected readonly model: Model<PromoCodeDocument>) {
        super(model);
    }

    async findActiveByCode(normalizedCode: string): Promise<PromoCodeDocument | null> {
        const code = normalizedCode.trim().toUpperCase();
        if (!code) return null;
        const doc = await this.model.findOne({ code, isActive: true }).exec();
        if (!doc) return null;
        if (doc.validFrom && doc.validFrom.getTime() > Date.now()) {
            return null;
        }
        if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) {
            return null;
        }
        if (doc.maxUses != null && doc.usedCount >= doc.maxUses) {
            return null;
        }
        return doc;
    }
}
