import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RiderVehicleUpdateRequestStatus } from '../../common/constants/rider.constants';

export type RiderVehicleUpdateRequestDocument = RiderVehicleUpdateRequest & Document;

@Schema({ timestamps: true })
export class RiderVehicleUpdateRequest {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'RiderVehicle', required: true })
    riderVehicleId: Types.ObjectId;

    @Prop({
        type: String,
        enum: Object.values(RiderVehicleUpdateRequestStatus),
        default: RiderVehicleUpdateRequestStatus.PENDING,
        index: true,
    })
    status: RiderVehicleUpdateRequestStatus;

    /** Lowercase combined string for admin list search (email + names). */
    @Prop({ type: String, index: true })
    riderSearchText: string;

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

    @Prop({ type: [String], default: [] })
    licensePlateImageUrls: string[];

    @Prop({ type: [String], default: [] })
    registrationDocumentUrls: string[];

    @Prop({ type: [String], default: [] })
    vehicleImageUrls: string[];

    @Prop({ type: String, trim: true, maxlength: 2000 })
    rejectionReason?: string;
}

export const RiderVehicleUpdateRequestSchema = SchemaFactory.createForClass(RiderVehicleUpdateRequest);

RiderVehicleUpdateRequestSchema.index({ status: 1, createdAt: -1 });
RiderVehicleUpdateRequestSchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { status: RiderVehicleUpdateRequestStatus.PENDING } },
);
