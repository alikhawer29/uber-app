import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type WalletTransactionDocument = WalletTransaction & Document;

export enum WalletTransactionType {
    TOPUP = 'topup',
    DEDUCT = 'deduct',
    ADJUSTMENT = 'adjustment',
}

@Schema({ timestamps: true, collection: 'wallet_transactions' })
export class WalletTransaction {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: String, enum: Object.values(WalletTransactionType), required: true })
    type: WalletTransactionType;

    /** Positive for topup, negative for deduct */
    @Prop({ type: Number, required: true })
    amount: number;

    @Prop({ type: String, default: 'USD', maxlength: 8 })
    currency: string;

    /** Stripe PaymentIntent ID when applicable */
    @Prop({ type: String, default: null })
    stripePaymentIntentId?: string | null;

    @Prop({ type: String, default: null, maxlength: 500 })
    note?: string | null;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

