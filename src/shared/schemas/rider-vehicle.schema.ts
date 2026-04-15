import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RiderVehicleApprovalStatus } from '../../common/constants/rider.constants';

export type RiderVehicleDocument = RiderVehicle & Document;

@Schema({ timestamps: true })
export class RiderVehicle {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'VehicleType', required: true })
    vehicleTypeId: Types.ObjectId;

    @Prop({ type: String, required: true, trim: true, maxlength: 120 })
    brandName: string;

    @Prop({ type: String, required: true, trim: true, maxlength: 120 })
    vehicleName: string;

    @Prop({ type: String, required: true, trim: true, maxlength: 80 })
    vehicleColor: string;

    @Prop({ type: String, required: true, trim: true, maxlength: 32 })
    licensePlateNumber: string;

    @Prop({
        type: String,
        enum: Object.values(RiderVehicleApprovalStatus),
        default: RiderVehicleApprovalStatus.PENDING,
        index: true,
    })
    approvalStatus: RiderVehicleApprovalStatus;

    @Prop({ type: String, trim: true, maxlength: 2000 })
    rejectionReason?: string;

    @Prop({ type: [String], default: [] })
    licensePlateImageUrls: string[];

    @Prop({ type: [String], default: [] })
    registrationDocumentUrls: string[];

    @Prop({ type: [String], default: [] })
    vehicleImageUrls: string[];
}

export const RiderVehicleSchema = SchemaFactory.createForClass(RiderVehicle);

RiderVehicleSchema.index({ approvalStatus: 1, createdAt: -1 });
RiderVehicleSchema.index({ userId: 1, approvalStatus: 1 });
