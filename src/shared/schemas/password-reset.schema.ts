import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PasswordResetDocument = PasswordReset & Document;

@Schema({
  timestamps: true,
  expires: '15m', // Auto delete after 15 minutes
})
export class PasswordReset {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  token: string;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ type: Date })
  usedAt: Date;

  @Prop({ type: Date, expires: 900 }) // 15 minutes in seconds
  expiresAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);

PasswordResetSchema.index({ email: 1, token: 1 });
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });