import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SavedPlaceDocument = SavedPlace & Document;

@Schema({ timestamps: true })
export class SavedPlace {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    /** User label, e.g. "Home" (Figma: Name) */
    @Prop({ type: String, required: true, trim: true, maxlength: 200 })
    name: string;

    /** Full address string from Google Places (Figma: Location) */
    @Prop({ type: String, required: true, trim: true, maxlength: 500 })
    formattedAddress: string;

    /** Google Place ID from Places API / SDK */
    @Prop({ type: String, trim: true, sparse: true })
    googlePlaceId?: string;

    @Prop({ type: Number, required: true, min: -90, max: 90 })
    latitude: number;

    @Prop({ type: Number, required: true, min: -180, max: 180 })
    longitude: number;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    @Prop({ type: Number, default: 0 })
    sortOrder: number;
}

export const SavedPlaceSchema = SchemaFactory.createForClass(SavedPlace);

SavedPlaceSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

SavedPlaceSchema.index({ userId: 1, isActive: 1, sortOrder: 1 });
SavedPlaceSchema.index({ userId: 1, googlePlaceId: 1 }, { unique: true, sparse: true });
