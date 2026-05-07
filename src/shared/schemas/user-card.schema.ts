import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type UserCardDocument = UserCard & Document;

@Schema({ timestamps: true, collection: 'user_cards' })
export class UserCard {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: String, required: true, trim: true, maxlength: 100 })
    cardHolderName: string;

    @Prop({ type: String, required: true, trim: true, maxlength: 32 })
    brand: string;

    @Prop({ type: String, required: true, trim: true, minlength: 4, maxlength: 4 })
    last4: string;

    @Prop({ type: Number, required: true, min: 1, max: 12 })
    expireMonth: number;

    @Prop({ type: Number, required: true, min: 0, max: 99 })
    expireYear: number;

    @Prop({ type: Boolean, default: false })
    isDefault: boolean;

    /** Stripe PaymentMethod ID (pm_...) */
    @Prop({ type: String, required: true, index: true })
    stripePaymentMethodId: string;
}

export const UserCardSchema = SchemaFactory.createForClass(UserCard);

UserCardSchema.index({ userId: 1, stripePaymentMethodId: 1 }, { unique: true });
UserCardSchema.index({ userId: 1, isDefault: 1 });

