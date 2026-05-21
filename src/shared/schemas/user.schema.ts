// shared/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole, UserStatus } from '../../common/constants/user.constants';
import { FileCategory } from '../../common/constants/file.constants';

export type UserDocument = User & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            const transformedRet = ret as any;

            // Convert ObjectId to string
            if (transformedRet._id && typeof transformedRet._id === 'object') {
                transformedRet.id = transformedRet._id.toString();
                delete transformedRet._id;
            }

            // Convert dates
            if (transformedRet.createdAt) {
                transformedRet.createdAt = new Date(transformedRet.createdAt).toISOString();
            }
            if (transformedRet.updatedAt) {
                transformedRet.updatedAt = new Date(transformedRet.updatedAt).toISOString();
            }
            if (transformedRet.deletedAt) {
                transformedRet.deletedAt = new Date(transformedRet.deletedAt).toISOString();
            }

            // Remove sensitive fields
            delete transformedRet.password;
            delete transformedRet.refreshToken;
            delete transformedRet.tokenInvalidBefore;
            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class User {
    @Prop({
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    })
    email: string;

    @Prop({ type: String, required: true, trim: true })
    firstName: string;

    @Prop({ type: String, required: true, trim: true })
    lastName: string;

    @Prop({ type: String, required: true, select: false })
    password: string;

    @Prop({
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.USER,
    })
    role: UserRole;

    @Prop({
        type: String,
        enum: Object.values(UserStatus),
        default: UserStatus.ACTIVE,
    })
    status: UserStatus;

    @Prop({ type: String, select: false })
    refreshToken?: string;

    @Prop({ type: Date, select: false })
    tokenInvalidBefore?: Date;

    @Prop({ type: String })
    phone?: string;

    @Prop({ type: String, trim: true })
    countryCode?: string;

    @Prop({ type: String })
    address?: string;

    @Prop({ type: String })
    avatar?: string;

    @Prop({ type: String })
    stripeCustomerId?: string;

    @Prop({ type: [String], default: [] })
    fcmTokens?: string[];

    @Prop({ type: Date })
    deletedAt?: Date;

    /** Set when admin rejects a rider application (optional context for the rider). */
    @Prop({ type: String, trim: true, maxlength: 2000 })
    applicationRejectionReason?: string;

    // ===== Google Calendar (per-admin) =====

    @Prop({ type: String, select: false })
    googleCalendarRefreshToken?: string;

    @Prop({ type: String })
    googleCalendarId?: string;

    @Prop({ type: String })
    googleCalendarEmail?: string;

    @Prop({ type: Date })
    googleCalendarConnectedAt?: Date;

    @Prop({
        type: [
            {
                calendarId: { type: String, required: true },
                summary: { type: String },
                primary: { type: Boolean },
                enabled: { type: Boolean, default: true },
            },
        ],
        _id: false,
        default: [],
    })
    googleCalendars?: {
        calendarId: string;
        summary?: string;
        primary?: boolean;
        enabled?: boolean;
    }[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for avatar file (relation to File schema)
UserSchema.virtual('avatarFile', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    justOne: true,
    match: {
        fileableType: 'User',
        category: FileCategory.AVATAR,
        isActive: true,
    },
});

// Virtual for all user files
UserSchema.virtual('files', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    match: {
        fileableType: 'User',
        isActive: true,
    },
});

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ deletedAt: 1 });