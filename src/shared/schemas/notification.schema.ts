import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum NotificationType {
    CONTACT_FORM = 'contact_form',
    BOOKING_CREATED = 'booking_created',
    SYSTEM = 'system',
    USER_ACTION = 'user_action',
    FILE_UPLOAD = 'file_upload',
    PASSWORD_RESET = 'password_reset',
    RIDER_APPLICATION = 'rider_application',
    /** Rider submitted a post-registration vehicle change (admins). */
    RIDER_VEHICLE_UPDATE_REQUEST = 'rider_vehicle_update_request',
    /** Rider’s driver application was approved (rider recipient). */
    RIDER_APPLICATION_APPROVED = 'rider_application_approved',
    /** Rider’s driver application was rejected (rider recipient). */
    RIDER_APPLICATION_REJECTED = 'rider_application_rejected',
    /** Rider’s pending registration vehicle was approved (rider recipient). */
    RIDER_VEHICLE_REGISTRATION_APPROVED = 'rider_vehicle_registration_approved',
    /** Rider’s pending registration vehicle was rejected (rider recipient). */
    RIDER_VEHICLE_REGISTRATION_REJECTED = 'rider_vehicle_registration_rejected',
    /** Rider’s vehicle detail update request was approved (rider recipient). */
    RIDER_VEHICLE_UPDATE_APPROVED = 'rider_vehicle_update_approved',
    /** Rider’s vehicle detail update request was rejected (rider recipient). */
    RIDER_VEHICLE_UPDATE_REJECTED = 'rider_vehicle_update_rejected',
}

export enum NotificationStatus {
    UNREAD = 'unread',
    READ = 'read',
    ARCHIVED = 'archived',
}

export type NotificationDocument = Notification & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
})
export class Notification {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({
        type: String,
        enum: Object.values(NotificationType),
        default: NotificationType.SYSTEM,
    })
    type: NotificationType;

    @Prop({
        type: String,
        enum: Object.values(NotificationStatus),
        default: NotificationStatus.UNREAD,
    })
    status: NotificationStatus;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    recipient: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    sender: MongooseSchema.Types.ObjectId;

    @Prop({ type: Object })
    data: Record<string, any>;

    @Prop()
    readAt: Date;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipient: 1, status: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ status: 1 });