import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Ride } from './ride.schema';
import { User } from './user.schema';

export type RideComplaintDocument = RideComplaint & Document;

@Schema({ timestamps: true, collection: 'ride_complaints' })
export class RideComplaint {
    @Prop({ type: Types.ObjectId, ref: Ride.name, required: true, index: true })
    rideId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: String, required: true, trim: true, minlength: 10, maxlength: 1000 })
    message: string;
}

export const RideComplaintSchema = SchemaFactory.createForClass(RideComplaint);

RideComplaintSchema.index({ rideId: 1, userId: 1 }, { unique: true });

