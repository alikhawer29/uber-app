import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Ride } from './ride.schema';
import { User } from './user.schema';

export type RideRequestDocument = RideRequest & Document;

export enum RideRequestStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'ride_requests' })
export class RideRequest {
    @Prop({ type: Types.ObjectId, ref: Ride.name, required: true, index: true })
    rideId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
    riderId: Types.ObjectId;

    @Prop({
        type: String,
        enum: Object.values(RideRequestStatus),
        default: RideRequestStatus.PENDING,
        index: true,
    })
    status: RideRequestStatus;

    @Prop({ type: String, default: null, maxlength: 200 })
    rejectReason?: string | null;
}

export const RideRequestSchema = SchemaFactory.createForClass(RideRequest);

RideRequestSchema.index({ rideId: 1, riderId: 1 }, { unique: true });
RideRequestSchema.index({ riderId: 1, status: 1, createdAt: -1 });

