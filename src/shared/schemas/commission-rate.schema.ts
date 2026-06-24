import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommissionRateDocument = CommissionRate & Document;

@Schema({ timestamps: true, collection: 'commission_rates' })
export class CommissionRate {
    @Prop({ type: Number, required: true, min: 0, max: 100 })
    percentage: number;
}

export const CommissionRateSchema = SchemaFactory.createForClass(CommissionRate);

CommissionRateSchema.index({ createdAt: -1 });
