import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PayoutSettingDocument = PayoutSetting & Document;

@Schema({ timestamps: true, collection: 'payout_settings' })
export class PayoutSetting {
    @Prop({ type: Number, required: true, min: 1, max: 365 })
    payoutDays: number;
}

export const PayoutSettingSchema = SchemaFactory.createForClass(PayoutSetting);

PayoutSettingSchema.index({ createdAt: -1 });
