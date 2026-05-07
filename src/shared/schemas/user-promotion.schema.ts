import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PromoCode } from './promo-code.schema';
import { User } from './user.schema';

export type UserPromotionDocument = UserPromotion & Document;

@Schema({ timestamps: true, collection: 'user_promotions' })
export class UserPromotion {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: PromoCode.name, required: true, index: true })
    promoCodeId: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    isUsed: boolean;

    @Prop({ type: Date, default: null })
    usedAt?: Date | null;
}

export const UserPromotionSchema = SchemaFactory.createForClass(UserPromotion);

UserPromotionSchema.index({ userId: 1, promoCodeId: 1 }, { unique: true });

