import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
    InternalServerErrorException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { FileRepository } from '../../../shared/repositories/file.repository';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { FileCategory, FileType } from 'src/common/constants/file.constants';
import { Types } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sanitizeUserUtils } from '../../../common/utils/sanitize-user-utils';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly fileRepository: FileRepository,
    ) { }

    async getProfile(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Remove sensitive data before returning
        return sanitizeUserUtils.sanitizeUser(user);
    }

    async updateProfile(
        userId: string,
        updateProfileDto: UpdateProfileDto,
        avatar?: Express.Multer.File
    ) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Check if email is being changed and if it's already taken
            if (updateProfileDto.email && updateProfileDto.email !== user.email) {
                const existingUser = await this.userRepository.findByEmail(updateProfileDto.email);
                if (existingUser && existingUser.id !== userId) {
                    throw new ConflictException('Email already in use');
                }
            }

            let updatedUser = await this.userRepository.update(userId, updateProfileDto);
            if (avatar) {
                await this.handleAvatarUpload(user, avatar);

                // Update user with new avatar URL
                const avatarUrl = `/uploads/${avatar.filename}`;
                updatedUser = await this.userRepository.update(userId, {
                    ...updateProfileDto,
                    avatar: avatarUrl
                });
            } else {
                // Update without avatar
                updatedUser = await this.userRepository.update(userId, updateProfileDto);
            }
            if (!updatedUser) {
                throw new InternalServerErrorException('Failed to update user profile');
            }

            // Remove sensitive data before returning
            // const { password, refreshToken, ...userProfile } = updatedUser.toObject();
            return sanitizeUserUtils.sanitizeUser(updatedUser);
        } catch (error) {
            this.logger.error(`Failed to update profile for user ${userId}: ${error.message}`);
            throw error;
        }
    }


    private async handleAvatarUpload(user: any, newAvatar: Express.Multer.File): Promise<void> {
        try {
            // 1. Delete old avatar file from database
            if (user.avatarFile) {
                await this.deleteOldAvatar(user);
            }

            // 2. Delete old avatar file from file system
            await this.deleteOldAvatarFileFromDisk(user);

            // 3. Create new avatar file record
            await this.createNewAvatarFile(user, newAvatar);

        } catch (error) {
            this.logger.error(`Failed to handle avatar upload for user ${user._id}:`, error);
            throw new BadRequestException('Failed to update avatar');
        }
    }

    private async deleteOldAvatar(user: any): Promise<void> {
        try {
            // Deactivate old avatar in database (soft delete)
            await this.fileRepository.deactivateUserAvatar(user._id.toString());

            // Optional: Hard delete old avatar record
            // await this.fileRepository.deleteMany({
            //     fileableId: new Types.ObjectId(user._id),
            //     fileableType: 'User',
            //     category: FileCategory.AVATAR,
            // });
        } catch (error) {
            this.logger.warn(`Failed to delete old avatar from database for user ${user._id}:`, error);
            // Continue even if this fails
        }
    }

    private async deleteOldAvatarFileFromDisk(user: any): Promise<void> {
        try {
            if (!user.avatar) {
                return;
            }

            // Extract filename from avatar URL
            let oldFilename: string;
            if (user.avatar.startsWith('/uploads/')) {
                oldFilename = user.avatar.replace('/uploads/', '');
            } else {
                oldFilename = user.avatar;
            }

            // Construct full path to the file
            const uploadsDir = path.join(process.cwd(), 'uploads');
            const oldFilePath = path.join(uploadsDir, oldFilename);

            // Check if file exists and delete it
            try {
                await fs.access(oldFilePath);
                await fs.unlink(oldFilePath);
                this.logger.log(`Deleted old avatar file: ${oldFilePath}`);
            } catch (error) {
                // File doesn't exist or can't be accessed - that's ok
                this.logger.debug(`Old avatar file not found or already deleted: ${oldFilePath}`);
            }
        } catch (error) {
            this.logger.warn(`Failed to delete old avatar file from disk for user ${user._id}:`, error);
            // Continue even if this fails
        }
    }

    private async createNewAvatarFile(user: any, newAvatar: Express.Multer.File): Promise<void> {
        // Validate new avatar
        await this.validateAvatarFile(newAvatar);

        // Create new avatar file record
        await this.fileRepository.create({
            name: newAvatar.filename,
            originalName: newAvatar.originalname,
            path: newAvatar.filename,
            mimeType: newAvatar.mimetype,
            size: newAvatar.size,
            type: FileType.IMAGE,
            category: FileCategory.AVATAR,
            fileableId: new Types.ObjectId(user._id),
            fileableType: 'User',
            uploadedBy: new Types.ObjectId(user._id),
            isActive: true,
        });
    }

    private async validateAvatarFile(avatar: Express.Multer.File): Promise<void> {
        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimeTypes.includes(avatar.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (avatar.size > maxSize) {
            throw new BadRequestException(
                `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
            );
        }
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
        const { oldPassword, newPassword, confirmNewPassword } = changePasswordDto;

        // Validate new password strength
        this.validatePasswordStrength(newPassword);

        // Check if new passwords match
        if (newPassword !== confirmNewPassword) {
            throw new BadRequestException('New passwords do not match');
        }

        // Check if new password is same as old password
        if (oldPassword === newPassword) {
            throw new BadRequestException('New password must be different from old password');
        }

        // Get user with password directly
        const user = await this.userRepository.findByIdWithPassword(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify old password
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw new BadRequestException('Old password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const updatedUser = await this.userRepository.update(userId, { password: hashedPassword });

        if (!updatedUser) {
            throw new InternalServerErrorException('Failed to update password');
        }

        this.logger.log(`Password changed successfully for user ${userId}`);
        return { message: 'Password changed successfully' };
    }

    async deactivateAccount(userId: string, confirmPassword?: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Optional: Require password confirmation for account deactivation
        if (confirmPassword) {
            const userWithPassword = await this.userRepository.findByIdWithPassword(userId);
            if (!userWithPassword) {
                throw new NotFoundException('User not found');
            }

            const isPasswordValid = await bcrypt.compare(confirmPassword, userWithPassword.password);
            if (!isPasswordValid) {
                throw new BadRequestException('Password is incorrect');
            }
        }

        const deactivatedUser = await this.userRepository.update(userId, {
            status: 'inactive',
            deactivatedAt: new Date()
        });

        if (!deactivatedUser) {
            throw new InternalServerErrorException('Failed to deactivate account');
        }

        this.logger.log(`Account deactivated for user ${userId}`);
        return { message: 'Account deactivated successfully' };
    }

    private validatePasswordStrength(password: string): void {
        if (password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters long');
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!strongPasswordRegex.test(password)) {
            throw new BadRequestException(
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            );
        }
    }

    async getUser(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        const { password, refreshToken, ...userProfile } = user.toObject();
        return userProfile;
    }
}