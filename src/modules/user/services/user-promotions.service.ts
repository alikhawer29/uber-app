import { BadRequestException, Injectable } from "@nestjs/common";
import { Types } from "mongoose";
import { PromoCodeRepository } from "src/shared/repositories/promo-code.repository";
import { UserPromotionRepository } from "src/shared/repositories/user-promotion.repository";
import { PromoDiscountType } from "src/shared/schemas/promo-code.schema";

@Injectable()
export class UserPromotionsService {
  constructor(
    private readonly promoCodeRepository: PromoCodeRepository,
    private readonly userPromotionRepository: UserPromotionRepository,
  ) {}

  async list(userId: string) {
    const rows = await this.userPromotionRepository.findByUserId(userId);
    const data = rows
      .map((row: any) => {
        const promo = row.promoCodeId;
        if (!promo) return null;
        const discount =
          promo.discountType === PromoDiscountType.PERCENT
            ? `${promo.value}%`
            : `${promo.value}`;
        return {
          promoId: String(promo._id),
          title: promo.title ?? "",
          code: promo.code,
          discount,
          validUntil: promo.expiresAt
            ? promo.expiresAt.toISOString().slice(0, 10)
            : null,
          isUsed: !!row.isUsed,
        };
      })
      .filter(Boolean);

    return { success: true, data };
  }

  async add(userId: string, promoCode: string) {
    const normalized = (promoCode ?? "").trim().toUpperCase();
    if (!normalized) throw new BadRequestException("Invalid promo code");

    const promo = await this.promoCodeRepository.findOne({
      code: normalized,
    } as any);
    if (!promo || !(promo as any).isActive) {
      throw new BadRequestException("Invalid promo code");
    }

    if (
      (promo as any).validFrom &&
      new Date((promo as any).validFrom).getTime() > Date.now()
    ) {
      const start = new Date((promo as any).validFrom)
        .toISOString()
        .slice(0, 10);
      throw new BadRequestException(
        `This promo code is not active yet. It becomes valid on ${start}`,
      );
    }
    if (
      (promo as any).expiresAt &&
      new Date((promo as any).expiresAt).getTime() < Date.now()
    ) {
      throw new BadRequestException("This promo code has expired");
    }

    const already = await this.userPromotionRepository.findByUserAndPromo(
      userId,
      String((promo as any)._id),
    );
    if (already) {
      throw new BadRequestException("You have already added this promo code");
    }

    await this.userPromotionRepository.create({
      userId: new Types.ObjectId(userId),
      promoCodeId: (promo as any)._id,
      isUsed: false,
    } as any);

    const discount =
      (promo as any).discountType === PromoDiscountType.PERCENT
        ? `${(promo as any).value}%`
        : `${(promo as any).value}`;

    return {
      success: true,
      message: "Promo code added successfully",
      data: {
        promoId: String((promo as any)._id),
        code: (promo as any).code,
        discount,
        validUntil: (promo as any).expiresAt
          ? (promo as any).expiresAt.toISOString().slice(0, 10)
          : null,
      },
    };
  }
}
