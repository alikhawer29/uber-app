import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true, collection: 'wallets' })
export class Wallet {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Number, required: true, default: 0 })
    balance: number;

    @Prop({ type: String, required: true, default: 'USD', maxlength: 8 })
    currency: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

