// shared/schemas/file.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FileType, FileCategory } from '../../common/constants/file.constants';

export type FileDocument = File & Document;

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

            // Remove unwanted fields
            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class File {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, required: true })
    originalName: string;

    @Prop({ type: String, required: true })
    path: string;

    @Prop({ type: String, required: true })
    mimeType: string;

    @Prop({ type: Number, required: true })
    size: number;

    @Prop({
        type: String,
        enum: Object.values(FileType),
        required: true,
    })
    type: FileType;

    @Prop({
        type: String,
        enum: Object.values(FileCategory),
        default: FileCategory.ATTACHMENT,
    })
    category: FileCategory;

    @Prop({ type: String })
    description?: string;

    // Polymorphic relationships
    @Prop({ type: Types.ObjectId, refPath: 'fileableType' })
    fileableId?: Types.ObjectId;

    @Prop({ type: String, required: true })
    fileableType: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    uploadedBy?: Types.ObjectId;

    @Prop({ default: true })
    isActive?: boolean;
}

export const FileSchema = SchemaFactory.createForClass(File);

// Virtual for URL
FileSchema.virtual('url').get(function () {
    if (!this.path) return null;

    // If already a full URL or absolute path
    if (this.path.startsWith('http') || this.path.startsWith('/')) {
        return this.path;
    }

    // Clean path and add base uploads directory
    const cleanPath = this.path.replace(/^\/+/, '');
    return `/uploads/${cleanPath}`;
});

// Virtual for fileable (polymorphic relationship)
FileSchema.virtual('fileable', {
    refPath: 'fileableType',
    localField: 'fileableId',
    foreignField: '_id',
    justOne: true,
});

// Indexes
FileSchema.index({ fileableId: 1, fileableType: 1 });
FileSchema.index({ type: 1 });
FileSchema.index({ category: 1 });
FileSchema.index({ uploadedBy: 1 });
FileSchema.index({ createdAt: -1 });
FileSchema.index({ isActive: 1 });
FileSchema.index({ 'fileableId': 1, 'category': 1 }); // For quick avatar lookups