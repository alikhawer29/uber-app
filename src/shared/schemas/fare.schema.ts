import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FareDocument = Fare & Document;

@Schema({ timestamps: true })
export class Fare {
    @Prop({ type: Types.ObjectId, ref: 'VehicleType', required: true, unique: true })
    vehicleTypeId: Types.ObjectId;

    @Prop({ type: Number, required: true, min: 0 })
    baseFare: number;

    /** Payment per km (Figma: Cost Per km) */
    @Prop({ type: Number, required: true, min: 0 })
    costPerKm: number;

    @Prop({ type: Number, required: true, min: 0 })
    waitingFeePerMin: number;

    @Prop({ type: Number, required: true, min: 0 })
    minimumFare: number;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;
}

export const FareSchema = SchemaFactory.createForClass(Fare);

FareSchema.index({ isActive: 1 });
