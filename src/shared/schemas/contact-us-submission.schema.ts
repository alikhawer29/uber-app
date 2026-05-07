import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum ContactUsSenderRole {
    USER = 'user',
    RIDER = 'rider',
}

export type ContactUsSubmissionDocument = ContactUsSubmission & Document;

@Schema({
    timestamps: true,
    collection: 'contact_us_submissions',
})
export class ContactUsSubmission {
    @Prop({ required: true, trim: true })
    firstName: string;

    @Prop({ required: true, trim: true })
    lastName: string;

    @Prop({ required: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true, trim: true })
    message: string;

    @Prop({
        required: true,
        type: String,
        enum: Object.values(ContactUsSenderRole),
    })
    senderRole: ContactUsSenderRole;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    userId?: Types.ObjectId;
}

export const ContactUsSubmissionSchema = SchemaFactory.createForClass(ContactUsSubmission);

ContactUsSubmissionSchema.index({ createdAt: -1 });
ContactUsSubmissionSchema.index({ senderRole: 1, createdAt: -1 });
