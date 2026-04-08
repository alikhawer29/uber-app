import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VehicleTypeDocument = VehicleType & Document;

@Schema({ timestamps: true })
export class VehicleType {
    @Prop({ type: String, required: true, trim: true, unique: true })
    name: string;

    /** e.g. "Seating Capacity: 2, Non-AC" from Figma Facilities */
    @Prop({ type: String, required: true, trim: true })
    facilities: string;

    @Prop({ type: String, trim: true })
    image?: string;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    @Prop({ type: Number, default: 0 })
    sortOrder: number;
}

export const VehicleTypeSchema = SchemaFactory.createForClass(VehicleType);

VehicleTypeSchema.index({ isActive: 1, sortOrder: 1 });
