import { Injectable } from '@nestjs/common';
import { CommissionRateRepository } from 'src/shared/repositories/commission-rate.repository';
import { PayoutSettingRepository } from 'src/shared/repositories/payout-setting.repository';
import { AdminCommissionHistoryQueryDto } from '../dto/admin-commission-history-query.dto';
import { SetCommissionRateDto } from '../dto/set-commission-rate.dto';
import { SetPayoutDaysDto } from '../dto/set-payout-days.dto';

const DEFAULT_COMMISSION = 18;
const DEFAULT_PAYOUT_DAYS = 5;

function toHistoryRow(doc: any, valueKey: string) {
    const o = doc.toObject ? doc.toObject() : { ...doc };
    const id = o._id?.toString?.() ?? String(o._id);
    delete o._id;
    delete o.__v;
    return {
        id,
        value: o[valueKey],
        lastModified: o.updatedAt ?? o.createdAt,
        createdAt: o.createdAt,
    };
}

@Injectable()
export class AdminCommissionService {
    constructor(
        private readonly commissionRateRepository: CommissionRateRepository,
        private readonly payoutSettingRepository: PayoutSettingRepository,
    ) {}

    async getCurrentCommission() {
        const latest = await this.commissionRateRepository.getLatest();
        const doc = latest as any;
        return {
            currentCommission: latest?.percentage ?? DEFAULT_COMMISSION,
            lastModified: doc?.updatedAt ?? doc?.createdAt ?? null,
        };
    }

    async setCommissionRate(dto: SetCommissionRateDto) {
        const created = await this.commissionRateRepository.create({
            percentage: dto.percentage,
        } as any);
        return {
            message: 'Commission rate updated',
            currentCommission: created.percentage,
            lastModified: (created as any).createdAt,
        };
    }

    async listCommissionHistory(query: AdminCommissionHistoryQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const raw = await this.commissionRateRepository.paginateHistory(page, limit, query.search);
        return {
            ...raw,
            data: raw.data.map((d, index) => ({
                serialNo: (page - 1) * limit + index + 1,
                ...toHistoryRow(d, 'percentage'),
            })),
        };
    }

    async getCurrentPayout() {
        const latest = await this.payoutSettingRepository.getLatest();
        const doc = latest as any;
        return {
            currentPayoutDays: latest?.payoutDays ?? DEFAULT_PAYOUT_DAYS,
            lastModified: doc?.updatedAt ?? doc?.createdAt ?? null,
        };
    }

    async setPayoutDays(dto: SetPayoutDaysDto) {
        const created = await this.payoutSettingRepository.create({
            payoutDays: dto.payoutDays,
        } as any);
        return {
            message: 'Payout days updated',
            currentPayoutDays: created.payoutDays,
            lastModified: (created as any).createdAt,
        };
    }

    async listPayoutHistory(query: AdminCommissionHistoryQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const raw = await this.payoutSettingRepository.paginateHistory(page, limit, query.search);
        return {
            ...raw,
            data: raw.data.map((d, index) => ({
                serialNo: (page - 1) * limit + index + 1,
                ...toHistoryRow(d, 'payoutDays'),
            })),
        };
    }
}
