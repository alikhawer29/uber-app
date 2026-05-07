import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type RiderLocationDocument = RiderLocation & Document;

@Schema({ timestamps: true, collection: 'rider_locations' })
export class RiderLocation {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true, index: true })
    riderId: Types.ObjectId;

    @Prop({
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
    })
    location: { type: 'Point'; coordinates: [number, number] };

    @Prop({ type: Number, default: null })
    heading?: number | null;

    @Prop({ type: Number, default: null, min: 0 })
    speed?: number | null;

    @Prop({ type: Boolean, default: false, index: true })
    isOnline: boolean;
}

export const RiderLocationSchema = SchemaFactory.createForClass(RiderLocation);

RiderLocationSchema.index({ location: '2dsphere' });
RiderLocationSchema.index({ isOnline: 1, updatedAt: -1 });

