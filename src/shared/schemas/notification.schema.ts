import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum NotificationType {
    CONTACT_FORM = 'contact_form',
    BOOKING_CREATED = 'booking_created',
    SYSTEM = 'system',
    USER_ACTION = 'user_action',
    FILE_UPLOAD = 'file_upload',
    PASSWORD_RESET = 'password_reset',
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