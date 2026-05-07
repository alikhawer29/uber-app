import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromoCodeDocument = PromoCode & Document;

export enum PromoDiscountType {
    FIXED = 'fixed',
    PERCENT = 'percent',
}

@Schema({ timestamps: true, collection: 'promo_codes' })
export class PromoCode {
    @Prop({ type: String, required: true, trim: true })
    title: string;

    @Prop({ type: String, required: true, unique: true, uppercase: true, trim: true })
    code: string;

    @Prop({
        type: String,
        enum: Object.values(PromoDiscountType),
        required: true,
    })
    discountType: PromoDiscountType;

    /** Fixed amount in currency units, or percent 0–100 when discountType is percent */
    @Prop({ type: Number, required: true, min: 0 })
    value: number;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    /** Promo is valid only on/after this date (optional). */
    @Prop({ type: Date, default: null })
    validFrom?: Date | null;

    @Prop({ type: Date, default: null })
    expiresAt?: Date | null;

    @Prop({ type: Number, default: null, min: 0 })
    maxUses?: number | null;

    @Prop({ type: Number, default: 0, min: 0 })
    usedCount: number;

    /** Minimum order subtotal (before discount) required to apply */
    @Prop({ type: Number, default: 0, min: 0 })
    minOrderAmount: number;
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);

PromoCodeSchema.index({ isActive: 1, expiresAt: 1 });
PromoCodeSchema.index({ isActive: 1, validFrom: 1, expiresAt: 1 });
