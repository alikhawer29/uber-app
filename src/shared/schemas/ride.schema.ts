import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
    RideCancelledBy,
    RidePaymentStatus,
    RidePaymentType,
    RideStatus,
} from '../../common/constants/ride.constants';

export type RideDocument = Ride & Document;

@Schema({ timestamps: true, collection: 'rides' })
export class Ride {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', default: null })
    driverId?: Types.ObjectId | null;

    /** Linked rider vehicle when assigned (optional) */
    @Prop({ type: Types.ObjectId, ref: 'RiderVehicle', default: null })
    vehicleId?: Types.ObjectId | null;

    @Prop({ type: String, required: true, trim: true, maxlength: 255 })
    pickupAddress: string;

    @Prop({ type: Number, required: true })
    pickupLat: number;

    @Prop({ type: Number, required: true })
    pickupLng: number;

    @Prop({ type: String, required: true, trim: true, maxlength: 255 })
    dropAddress: string;

    @Prop({ type: Number, required: true })
    dropLat: number;

    @Prop({ type: Number, required: true })
    dropLng: number;

    @Prop({ type: Date, required: true, index: true })
    startTime: Date;

    @Prop({ type: Date, default: null })
    endTime?: Date | null;

    @Prop({ type: Number, default: null })
    distanceKm?: number | null;

    @Prop({ type: Number, default: null })
    estimatedDuration?: number | null;

    @Prop({ type: Number, default: null })
    actualDuration?: number | null;

    /** Vehicle category label, e.g. Mini, Mini Plus (aligned with vehicle type name) */
    @Prop({ type: String, required: true, trim: true, maxlength: 50 })
    rideType: string;

    @Prop({ type: String, default: null, maxlength: 300 })
    notes?: string | null;

    @Prop({ type: Types.ObjectId, default: null })
    cardId?: Types.ObjectId | null;

    @Prop({ type: Number, required: true, default: 0 })
    baseFare: number;

    @Prop({ type: Number, required: true, default: 0 })
    distanceFare: number;

    @Prop({ type: Number, required: true, default: 0 })
    timeFare: number;

    @Prop({ type: Number, required: true, default: 0 })
    discount: number;

    @Prop({ type: Number, required: true, default: 0 })
    tax: number;

    @Prop({ type: Number, required: true })
    totalAmount: number;

    @Prop({
        type: String,
        enum: Object.values(RidePaymentType),
        required: true,
    })
    paymentType: RidePaymentType;

    @Prop({
        type: String,
        enum: Object.values(RidePaymentStatus),
        default: RidePaymentStatus.PENDING,
    })
    paymentStatus: RidePaymentStatus;

    @Prop({
        type: String,
        enum: Object.values(RideStatus),
        default: RideStatus.PENDING,
    })
    status: RideStatus;

    @Prop({ type: Boolean, required: true, default: false, index: true })
    isScheduled: boolean;

    @Prop({
        type: String,
        enum: Object.values(RideCancelledBy),
        required: false,
    })
    cancelledBy?: RideCancelledBy;

    @Prop({ type: String, default: null })
    cancelReason?: string | null;

    @Prop({ type: String, default: null, maxlength: 10 })
    otpCode?: string | null;

    @Prop({ type: Number, default: null, min: 0, max: 5 })
    ratingByUser?: number | null;

    @Prop({ type: String, default: null, maxlength: 500 })
    reviewByUser?: string | null;

    @Prop({ type: Number, default: null, min: 0, max: 5 })
    ratingByDriver?: number | null;

    @Prop({ type: Types.ObjectId, ref: 'VehicleType', default: null })
    vehicleTypeId?: Types.ObjectId | null;

    /** Stripe PaymentIntent id after card charge on completion */
    @Prop({ type: String, default: null })
    stripePaymentIntentId?: string | null;
}

export const RideSchema = SchemaFactory.createForClass(Ride);

RideSchema.index({ userId: 1, createdAt: -1 });
RideSchema.index({ status: 1, startTime: 1 });
