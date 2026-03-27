import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PasswordReset, PasswordResetDocument } from '../schemas/password-reset.schema';

@Injectable()
export class PasswordResetRepository extends BaseRepository<PasswordResetDocument> {
    constructor(
        @InjectModel(PasswordReset.name) protected readonly passwordResetModel: Model<PasswordResetDocument>,
    ) {
        super(passwordResetModel);
    }

    async findByEmailAndToken(email: string, token: string): Promise<PasswordResetDocument | null> {
        // Use UTC for consistent date comparison
        const nowUTC = new Date();
        return this.passwordResetModel
            .findOne({
                email: email.toLowerCase(),
                token,
                isUsed: false,
                expiresAt: { $gt: nowUTC }
            })
            .exec();
    }

    async invalidatePreviousTokens(email: string): Promise<void> {
        // Use UTC for consistent date storage
        const nowUTC = new Date();
        await this.passwordResetModel
            .updateMany(
                {
                    email: email.toLowerCase(),
                    isUsed: false
                },
                {
                    isUsed: true,
                    usedAt: nowUTC
                }
            )
            .exec();
    }

    async createResetToken(email: string, token: string): Promise<PasswordResetDocument> {
        // Invalidate previous tokens
        await this.invalidatePreviousTokens(email);

        // Create new token with UTC time
        const now = new Date();
        const expiresAt = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes() + 15, // 15 minutes from now
            now.getUTCSeconds(),
            now.getUTCMilliseconds()
        ));

        return this.create({
            email: email.toLowerCase(),
            token,
            expiresAt,
        });
    }

    async markTokenAsUsed(email: string, token: string): Promise<PasswordResetDocument | null> {
        // Use UTC for consistent date comparison and storage
        const nowUTC = new Date();
        return this.passwordResetModel
            .findOneAndUpdate(
                {
                    email: email.toLowerCase(),
                    token,
                    isUsed: false,
                    expiresAt: { $gt: nowUTC }
                },
                {
                    isUsed: true,
                    usedAt: nowUTC
                },
                { new: true }
            )
            .exec();
    }

    async isValidToken(email: string, token: string): Promise<boolean> {
        const resetToken = await this.findByEmailAndToken(email, token);
        return resetToken !== null;
    }

    // Add cleanup method for expired tokens
    async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
        // Use UTC for consistent date comparison
        const nowUTC = new Date();
        const result = await this.passwordResetModel
            .deleteMany({
                $or: [
                    { expiresAt: { $lt: nowUTC } },
                    { isUsed: true }
                ]
            })
            .exec();

        return { deletedCount: result.deletedCount };
    }

    // Method to get expired tokens count (for monitoring)
    async getExpiredTokensCount(): Promise<number> {
        // Use UTC for consistent date comparison
        const nowUTC = new Date();
        return this.passwordResetModel
            .countDocuments({
                expiresAt: { $lt: nowUTC }
            })
            .exec();
    }
}