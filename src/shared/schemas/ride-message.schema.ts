import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Ride } from './ride.schema';
import { User } from './user.schema';

export type RideMessageDocument = RideMessage & Document;

export enum RideMessageSenderType {
    USER = 'user',
    RIDER = 'rider',
}

@Schema({ timestamps: true, collection: 'ride_messages' })
export class RideMessage {
    @Prop({ type: Types.ObjectId, ref: Ride.name, required: true, index: true })
    rideId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
    senderId: Types.ObjectId;

    @Prop({ type: String, enum: Object.values(RideMessageSenderType), required: true })
    senderType: RideMessageSenderType;

    @Prop({ type: String, required: true, trim: true, maxlength: 500 })
    message: string;
}

export const RideMessageSchema = SchemaFactory.createForClass(RideMessage);

RideMessageSchema.index({ rideId: 1, createdAt: 1 });

