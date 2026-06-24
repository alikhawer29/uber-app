import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReportStatus } from '../../common/constants/admin.constants';
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

    @Prop({
        type: String,
        enum: Object.values(ReportStatus),
        default: ReportStatus.PENDING,
        index: true,
    })
    status: ReportStatus;

    @Prop({ type: Date, default: null })
    resolvedAt?: Date | null;

    @Prop({ type: Types.ObjectId, ref: User.name, default: null })
    resolvedByAdminId?: Types.ObjectId | null;
}

export const RideComplaintSchema = SchemaFactory.createForClass(RideComplaint);

RideComplaintSchema.index({ rideId: 1, userId: 1 }, { unique: true });
RideComplaintSchema.index({ status: 1, createdAt: -1 });

