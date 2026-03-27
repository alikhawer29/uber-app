import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { File, FileDocument } from '../schemas/file.schema';
import { FileType, FileCategory } from '../../common/constants/file.constants';
import * as fs from 'fs/promises';
import * as path from 'path';
@Injectable()
export class FileRepository extends BaseRepository<FileDocument> {
    private readonly logger = new Logger(FileRepository.name);
    constructor(
        @InjectModel(File.name) protected readonly fileModel: Model<FileDocument>,
    ) {
        super(fileModel);
    }

    async findByUser(userId: string): Promise<FileDocument[]> {
        return this.fileModel
            .find({ uploadedBy: userId, isActive: true })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByEntity(
        fileableId: string,
        fileableType: string,
    ): Promise<FileDocument[]> {
        return this.fileModel
            .find({ fileableId, fileableType, isActive: true })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByTypeAndCategory(
        type: FileType,
        category: FileCategory,
        userId: string,
    ): Promise<FileDocument[]> {
        return this.fileModel
            .find({ type, category, uploadedBy: userId, isActive: true })
            .exec();
    }

    async softDelete(fileId: string): Promise<FileDocument | null> {
        return this.fileModel
            .findByIdAndUpdate(fileId, { isActive: false }, { new: true })
            .exec();
    }

    async deactivateUserAvatar(userId: string): Promise<void> {
        await this.fileModel.updateMany(
            {
                fileableId: new Types.ObjectId(userId),
                fileableType: 'User',
                category: FileCategory.AVATAR,
                isActive: true,
            },
            {
                isActive: false,
                updatedAt: new Date()
            }
        );
    }

    async deactivateTutorialFile(tutorialId: string, fileType: FileType): Promise<void> {
        await this.fileModel.updateMany(
            {
                fileableId: new Types.ObjectId(tutorialId),
                fileableType: 'Tutorial',
                type: fileType,
                isActive: true,
            },
            {
                isActive: false,
                updatedAt: new Date()
            }
        );
    }

    async deleteTutorialFile(tutorialId: string, fileType: FileType): Promise<void> {
        try {
            // First, find files to get their paths
            const filesToDelete = await this.fileModel.find({
                fileableId: new Types.ObjectId(tutorialId),
                fileableType: 'Tutorial',
                type: fileType,
            }).exec();

            if (filesToDelete.length === 0) {
                return;
            }

            // Delete from disk
            await this.deleteFilesFromDisk(filesToDelete);

            // Delete from database
            await this.fileModel.deleteMany({
                fileableId: new Types.ObjectId(tutorialId),
                fileableType: 'Tutorial',
                type: fileType,
            });

            this.logger.log(`Hard deleted ${filesToDelete.length} ${fileType} file(s) for tutorial ${tutorialId}`);

        } catch (error) {
            this.logger.error(`Failed to delete tutorial files: ${error.message}`, error.stack);
            throw error;
        }
    }

    async deleteServiceFile(serviceId: string, fileType: FileType): Promise<void> {
        try {
            const filesToDelete = await this.fileModel.find({
                fileableId: new Types.ObjectId(serviceId),
                fileableType: 'Service',
                type: fileType,
            }).exec();

            if (filesToDelete.length === 0) {
                return;
            }

            await this.deleteFilesFromDisk(filesToDelete);

            await this.fileModel.deleteMany({
                fileableId: new Types.ObjectId(serviceId),
                fileableType: 'Service',
                type: fileType,
            });

            this.logger.log(`Hard deleted ${filesToDelete.length} ${fileType} file(s) for service ${serviceId}`);
        } catch (error) {
            this.logger.error(`Failed to delete service files: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async deleteFilesFromDisk(files: FileDocument[]): Promise<void> {
        const uploadsDir = path.join(process.cwd(), 'uploads');

        for (const file of files) {
            try {
                if (file.path) {
                    // Extract filename from path
                    let filename: string;
                    if (file.path.startsWith('/uploads/')) {
                        filename = file.path.replace('/uploads/', '');
                    } else if (file.path.startsWith('uploads/')) {
                        filename = file.path.replace('uploads/', '');
                    } else {
                        filename = file.path;
                    }

                    const filePath = path.join(uploadsDir, filename);

                    // Check if file exists
                    try {
                        await fs.access(filePath);

                        // Delete the file
                        await fs.unlink(filePath);
                        this.logger.log(`Deleted file from disk: ${filePath}`);

                        // Optional: Delete empty directories
                        await this.cleanupEmptyDirectories(path.dirname(filePath));

                    } catch (error) {
                        // File doesn't exist or can't be accessed
                        this.logger.warn(`File not found or can't be deleted: ${filePath}`, error.message);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to delete file ${file._id} from disk:`, error.message);
                // Continue with other files even if one fails
            }
        }
    }

    private async cleanupEmptyDirectories(dirPath: string): Promise<void> {
        try {
            const uploadsBaseDir = path.join(process.cwd(), 'uploads');

            // Only clean up directories within uploads folder
            if (!dirPath.startsWith(uploadsBaseDir)) {
                return;
            }

            // Don't delete the base uploads directory
            if (dirPath === uploadsBaseDir) {
                return;
            }

            // Check if directory is empty
            const files = await fs.readdir(dirPath);

            if (files.length === 0) {
                // Directory is empty, delete it
                await fs.rmdir(dirPath);
                this.logger.log(`Deleted empty directory: ${dirPath}`);

                // Recursively check parent directory
                const parentDir = path.dirname(dirPath);
                await this.cleanupEmptyDirectories(parentDir);
            }
        } catch (error) {
            this.logger.warn(`Failed to cleanup directory ${dirPath}:`, error.message);
        }
    }

    async findTutorialFiles(tutorialId: string): Promise<FileDocument[]> {
        return this.fileModel
            .find({
                fileableId: new Types.ObjectId(tutorialId),
                fileableType: 'Tutorial',
                isActive: true,
            })
            .exec();
    }
}