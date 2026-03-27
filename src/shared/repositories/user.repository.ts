import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { User, UserDocument } from '../schemas/user.schema';
import { SearchUtils } from '../../common/utils/search.utils';

@Injectable()
export class UserRepository extends BaseRepository<UserDocument> {
    constructor(
        @InjectModel(User.name) protected readonly userModel: Model<UserDocument>,
    ) {
        super(userModel);
    }

    async findByEmail(email: string, includeSensitive: boolean = false): Promise<UserDocument | null> {
        let query = this.userModel.findOne({ email: email.toLowerCase().trim() });

        if (includeSensitive) {
            query = query.select('+password +refreshToken');
        }

        return query.exec();
    }

    async findByEmailWithPassword(email: string, includeSensitive: boolean = false): Promise<UserDocument | null> {
        return this.userModel.findOne({ email: email.toLowerCase().trim() }).select('+password')
            .exec();
    }

    async findByIdWithPassword(id: string): Promise<UserDocument | null> {
        return this.userModel
            .findById(id)
            .select('+password')
            .exec();
    }

    async findByIdWithRefreshToken(id: string): Promise<UserDocument | null> {
        return this.userModel
            .findById(id)
            .select('+refreshToken')
            .exec();
    }

    async findByIdWithGoogleCalendarToken(id: string): Promise<UserDocument | null> {
        return this.userModel
            .findById(id)
            .select('+googleCalendarRefreshToken')
            .exec();
    }

    async updateGoogleCalendarCredentials(
        userId: string,
        data: Partial<{
            googleCalendarRefreshToken: string | null;
            googleCalendarId: string | null;
            googleCalendarEmail: string | null;
            googleCalendarConnectedAt: Date | null;
            googleCalendars: {
                calendarId: string;
                summary?: string;
                primary?: boolean;
                enabled?: boolean;
            }[] | null;
        }>,
    ): Promise<void> {
        await this.userModel
            .findByIdAndUpdate(userId, data, { new: true })
            .exec();
    }

    async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
        await this.userModel
            .findByIdAndUpdate(userId, { refreshToken }, { new: true })
            .exec();
    }

    async existsByEmail(email: string): Promise<boolean> {
        const count = await this.userModel
            .countDocuments({ email: email.toLowerCase().trim() })
            .exec();
        return count > 0;
    }

    async findByStatus(status: string): Promise<UserDocument[]> {
        return this.userModel
            .find({ status })
            .exec();
    }

    async softDelete(userId: string): Promise<UserDocument | null> {
        return this.userModel
            .findByIdAndUpdate(
                userId,
                {
                    status: 'deleted',
                    deletedAt: new Date()
                },
                { new: true }
            )
            .exec();
    }

    async findActiveUserByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel
            .findOne({
                email: email.toLowerCase().trim(),
                status: { $ne: 'deleted' }
            })
            .exec();
    }

    // NEW METHODS FOR AVATAR AND FILE RELATIONSHIPS

    async findByIdWithAvatar(id: string): Promise<UserDocument | null> {
        return this.userModel
            .findById(new Types.ObjectId(id))
            .select('-password -refreshToken')
            .populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            })
            .exec();
    }

    async findByEmailWithAvatar(email: string): Promise<UserDocument | null> {
        if (!email) {
            return null;
        }
        
        return this.userModel
            .findOne({ email: email.toLowerCase().trim() })
            .select('-password -refreshToken')
            .populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            })
            .exec();
    }

    async findUserWithFiles(id: string): Promise<UserDocument | null> {
        return this.userModel
            .findById(new Types.ObjectId(id))
            .select('-password -refreshToken')
            .populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            })
            .populate({
                path: 'files',
                select: 'name originalName path mimeType size type category url',
            })
            .exec();
    }

    async findActiveUsersWithAvatars(): Promise<UserDocument[]> {
        return this.userModel
            .find({
                status: { $ne: 'deleted' },
                deletedAt: null
            })
            .select('-password -refreshToken')
            .populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            })
            .exec();
    }

    async updateUserAvatar(userId: string, avatarPath: string): Promise<UserDocument | null> {
        return this.userModel
            .findByIdAndUpdate(
                new Types.ObjectId(userId),
                { avatar: avatarPath },
                { new: true }
            )
            .select('-password -refreshToken')
            .populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            })
            .exec();
    }

    async findByIdWithAvatarAndFiles(id: string): Promise<UserDocument | null> {
        return this.userModel
            .findById(new Types.ObjectId(id))
            .select('-password -refreshToken')
            .populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            })
            .populate({
                path: 'files',
                select: 'name originalName path mimeType size type category url',
                match: { isActive: true },
            })
            .exec();
    }

    async getProfile(userId: string): Promise<UserDocument | null> {
        return this.userModel
            .findById(new Types.ObjectId(userId))
            .select('-password -refreshToken')
            .populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            })
            .populate({
                path: 'files',
                select: 'name originalName path mimeType size type category url',
                match: {
                    isActive: true,
                    category: { $ne: 'avatar' } // Exclude avatar from general files
                },
            })
            .exec();
    }

    async searchUsers(query: string, includeAvatar: boolean = false): Promise<UserDocument[]> {
        const searchConditions = SearchUtils.buildUserSearchQuery(query);
        
        const searchQuery: any = {
            status: { $ne: 'deleted' }
        };

        if (searchConditions.length > 0) {
            searchQuery.$or = searchConditions;
        }

        const dbQuery = this.userModel
            .find(searchQuery)
            .select('-password -refreshToken');

        if (includeAvatar) {
            dbQuery.populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            });
        }

        return dbQuery.exec();
    }

    async updateUserProfile(
        userId: string,
        updates: Partial<{
            firstName: string;
            lastName: string;
            phone: string;
            address: string;
            avatar: string;
        }>
    ): Promise<UserDocument | null> {
        return this.userModel
            .findByIdAndUpdate(
                new Types.ObjectId(userId),
                updates,
                { new: true }
            )
            .select('-password -refreshToken')
            .populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            })
            .exec();
    }

    async countActiveUsers(): Promise<number> {
        return this.userModel
            .countDocuments({
                status: 'active',
                deletedAt: null
            })
            .exec();
    }

    async findUsersWithRole(role: string, includeAvatar: boolean = false): Promise<UserDocument[]> {
        const query = this.userModel
            .find({
                role,
                status: 'active',
                deletedAt: null
            })
            .select('-password -refreshToken');

        if (includeAvatar) {
            query.populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            });
        }

        return query.exec();
    }

    async findByIds(ids: string[], includeAvatar: boolean = false): Promise<UserDocument[]> {
        const objectIds = ids.map(id => new Types.ObjectId(id));
        const query = this.userModel
            .find({
                _id: { $in: objectIds },
                status: { $ne: 'deleted' }
            })
            .select('-password -refreshToken');

        if (includeAvatar) {
            query.populate({
                path: 'avatarFile',
                select: 'name path mimeType size url',
            });
        }

        return query.exec();
    }

    /**
     * Add FCM token to user's token array (avoid duplicates)
     */
    async addFcmToken(userId: string, fcmToken: string): Promise<void> {
        await this.userModel
            .findByIdAndUpdate(
                userId,
                {
                    $addToSet: { fcmTokens: fcmToken }, // $addToSet prevents duplicates
                },
                { new: true }
            )
            .exec();
    }

    /**
     * Remove FCM token from user's token array
     */
    async removeFcmToken(fcmToken: string): Promise<void> {
        await this.userModel
            .updateMany(
                { fcmTokens: fcmToken },
                {
                    $pull: { fcmTokens: fcmToken },
                }
            )
            .exec();
    }

    /**
     * Remove FCM token from specific user
     */
    async removeFcmTokenFromUser(userId: string, fcmToken: string): Promise<void> {
        await this.userModel
            .findByIdAndUpdate(
                userId,
                {
                    $pull: { fcmTokens: fcmToken },
                },
                { new: true }
            )
            .exec();
    }

    /**
     * Clear all FCM tokens for a user (used on logout)
     */
    async clearAllFcmTokens(userId: string): Promise<void> {
        await this.userModel
            .findByIdAndUpdate(
                userId,
                {
                    $set: { fcmTokens: [] },
                },
                { new: true }
            )
            .exec();
    }
}