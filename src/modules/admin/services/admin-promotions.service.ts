import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { PromoCodeRepository } from 'src/shared/repositories/promo-code.repository';
import { PromoDiscountType } from 'src/shared/schemas/promo-code.schema';
import { CreatePromotionDto, AdminPromotionStatusDto } from '../dto/create-promotion.dto';
import { ListPromotionsQueryDto, AdminPromotionStatusFilterDto } from '../dto/list-promotions-query.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { UpdatePromotionStatusDto } from '../dto/update-promotion-status.dto';

function parseDiscount(discount: string): { discountType: PromoDiscountType; value: number } {
    const raw = (discount ?? '').trim();
    if (!raw) throw new BadRequestException('Discount is required');

    const isPercent = raw.endsWith('%');
    const numberPart = isPercent ? raw.slice(0, -1).trim() : raw;
    const value = Number(numberPart);
    if (!Number.isFinite(value)) throw new BadRequestException('Invalid discount value');

    if (isPercent) {
        if (value < 0 || value > 100) throw new BadRequestException('Percent discount must be between 0 and 100');
        return { discountType: PromoDiscountType.PERCENT, value };
    }

    if (value < 0) throw new BadRequestException('Fixed discount must be >= 0');
    return { discountType: PromoDiscountType.FIXED, value };
}

function toActiveFlag(status?: AdminPromotionStatusDto) {
    if (!status) return true;
    return status === AdminPromotionStatusDto.ACTIVE;
}

@Injectable()
export class AdminPromotionsService {
    constructor(private readonly promoCodeRepository: PromoCodeRepository) { }

    async create(dto: CreatePromotionDto) {
        const normalizedCode = dto.code.trim().toUpperCase();
        const exists = await this.promoCodeRepository.findOne({ code: normalizedCode } as any);
        if (exists) {
            throw new BadRequestException('A promo with this code already exists');
        }

        const { discountType, value } = parseDiscount(dto.discount);
        const validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
        const validUntil = dto.validUntil ? new Date(dto.validUntil) : null;

        if (validFrom && Number.isNaN(validFrom.getTime())) throw new BadRequestException('Invalid validFrom date');
        if (validUntil && Number.isNaN(validUntil.getTime())) throw new BadRequestException('Invalid validUntil date');
        if (validFrom && validUntil && validUntil.getTime() < validFrom.getTime()) {
            throw new BadRequestException('validUntil must be after validFrom');
        }

        const promo = await this.promoCodeRepository.create({
            title: dto.title.trim(),
            code: normalizedCode,
            discountType,
            value,
            maxUses: dto.usageLimit ?? null,
            validFrom,
            expiresAt: validUntil,
            isActive: toActiveFlag(dto.status),
        } as any);

        return promo;
    }

    async list(query: ListPromotionsQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        const conditions: FilterQuery<any> = {};
        if (query.status && query.status !== AdminPromotionStatusFilterDto.ALL) {
            conditions.isActive = query.status === AdminPromotionStatusFilterDto.ACTIVE;
        }

        return this.promoCodeRepository.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
        });
    }

    async detail(id: string) {
        const promo = await this.promoCodeRepository.findById(id);
        if (!promo) throw new NotFoundException('Promo not found');
        return promo;
    }

    async update(id: string, dto: UpdatePromotionDto) {
        const patch: Record<string, unknown> = {};

        if (dto.title != null) patch.title = dto.title.trim();

        if (dto.code != null) {
            const normalizedCode = dto.code.trim().toUpperCase();
            const existing = await this.promoCodeRepository.findOne({ code: normalizedCode } as any);
            if (existing && String((existing as any)._id) !== String(id)) {
                throw new BadRequestException('A promo with this code already exists');
            }
            patch.code = normalizedCode;
        }

        if (dto.discount != null) {
            const { discountType, value } = parseDiscount(dto.discount);
            patch.discountType = discountType;
            patch.value = value;
        }

        if (dto.usageLimit !== undefined) {
            patch.maxUses = dto.usageLimit;
        }

        if (dto.validFrom !== undefined) {
            if (dto.validFrom === null) patch.validFrom = null;
            else {
                const d = new Date(dto.validFrom);
                if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid validFrom date');
                patch.validFrom = d;
            }
        }

        if (dto.validUntil !== undefined) {
            if (dto.validUntil === null) patch.expiresAt = null;
            else {
                const d = new Date(dto.validUntil);
                if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid validUntil date');
                patch.expiresAt = d;
            }
        }

        if (dto.status != null) patch.isActive = toActiveFlag(dto.status);

        const updated = await this.promoCodeRepository.update(id, patch as any);
        if (!updated) throw new NotFoundException('Promo not found');

        // Cross-field check (validFrom <= expiresAt) after update
        if ((updated as any).validFrom && (updated as any).expiresAt) {
            if ((updated as any).expiresAt.getTime() < (updated as any).validFrom.getTime()) {
                throw new BadRequestException('validUntil must be after validFrom');
            }
        }

        return updated;
    }

    async updateStatus(id: string, dto: UpdatePromotionStatusDto) {
        const updated = await this.promoCodeRepository.update(id, {
            isActive: dto.status === AdminPromotionStatusDto.ACTIVE,
        } as any);
        if (!updated) throw new NotFoundException('Promo not found');
        return updated;
    }
}

