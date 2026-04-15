import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Types } from 'mongoose';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { RiderVehicleRepository } from 'src/shared/repositories/rider-vehicle.repository';
import { VehicleTypeRepository } from 'src/shared/repositories/vehicle-type.repository';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { RiderRegisterDto } from '../dto/rider-register.dto';
import { UserRole } from 'src/common/constants/user.constants';
import { UserStatus } from 'src/common/constants/user.constants';
import { RiderVehicleApprovalStatus } from 'src/common/constants/rider.constants';
import { FileType, FileCategory } from 'src/common/constants/file.constants';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { NotificationType } from 'src/shared/schemas/notification.schema';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';
import { LoginDto } from 'src/modules/user/dto/login.dto';
import { UserAuthService } from 'src/modules/user/services/user-auth.service';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = /^image\/(jpeg|jpg|pjpeg|png)$/i;
const MAX_IMAGES_PER_GROUP = 15;

@Injectable()
export class RiderAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly riderVehicleRepository: RiderVehicleRepository,
        private readonly vehicleTypeRepository: VehicleTypeRepository,
        private readonly fileRepository: FileRepository,
        private readonly notificationService: NotificationService,
        private readonly userAuthService: UserAuthService,
    ) {}

    async login(loginDto: LoginDto) {
        const { email, password, fcmToken } = loginDto;
        const user = await this.userRepository.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (String(user.role) !== UserRole.RIDER) {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is not active');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (fcmToken && fcmToken.trim() !== '') {
            await this.userRepository.addFcmToken(user._id.toString(), fcmToken.trim());
        }
        const tokens = await this.userAuthService.establishSession(
            user._id.toString(),
            user.email,
            user.role,
        );
        const updatedUser = await this.userRepository.findByEmailWithAvatar(email);
        return {
            user: sanitizeUserUtils.sanitizeUser(updatedUser),
            ...tokens,
        };
    }

    async logout(userId: string) {
        return this.userAuthService.logout(userId);
    }

    async refreshTokens(refreshToken: string) {
        const payload = await this.userAuthService.verifyRefreshToken(refreshToken);
        if (!payload) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.userRepository.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
        if (String(user.role) !== UserRole.RIDER) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
        return this.userAuthService.refreshTokens(payload.sub, refreshToken);
    }

    async register(dto: RiderRegisterDto, files: Record<string, Express.Multer.File[] | undefined>) {
        if (dto.password !== dto.confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        const licensePlateFiles = this.mergeMultipartFiles(files, 'licensePlateImage');
        const documentFiles = this.mergeMultipartFiles(files, 'documentImage');
        const vehicleFiles = this.mergeMultipartFiles(files, 'vehicleImage');

        if (licensePlateFiles.length === 0 || documentFiles.length === 0 || vehicleFiles.length === 0) {
            throw new BadRequestException(
                'At least one licensePlateImage (or licensePlateImage[]), one documentImage (or documentImage[]), and one vehicleImage (or vehicleImage[]) are required (JPG, JPEG, or PNG; max 3 MB each)',
            );
        }
        for (const group of [licensePlateFiles, documentFiles, vehicleFiles]) {
            if (group.length > MAX_IMAGES_PER_GROUP) {
                throw new BadRequestException(`At most ${MAX_IMAGES_PER_GROUP} images allowed per upload group`);
            }
            for (const f of group) {
                this.assertImageUnderLimit(f);
            }
        }

        const existing = await this.userRepository.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('Email already exists');
        }

        const vehicleType = await this.vehicleTypeRepository.findById(dto.vehicleTypeId);
        if (!vehicleType || !vehicleType.isActive) {
            throw new BadRequestException('Invalid or inactive vehicle type');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        let userId: string | null = null;
        let vehicleId: string | null = null;
        const uploadedPaths: string[] = [];

        try {
            const user = await this.userRepository.create({
                email: dto.email.toLowerCase().trim(),
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                phone: dto.phone.trim(),
                password: hashedPassword,
                role: UserRole.RIDER,
                status: UserStatus.PENDING_APPROVAL,
            });
            userId = user._id.toString();

            const vehicle = await this.riderVehicleRepository.create({
                userId: new Types.ObjectId(userId),
                vehicleTypeId: new Types.ObjectId(dto.vehicleTypeId),
                brandName: dto.brandName.trim(),
                vehicleName: dto.vehicleName.trim(),
                vehicleColor: dto.vehicleColor.trim(),
                licensePlateNumber: dto.licensePlateNumber.trim().toUpperCase(),
                approvalStatus: RiderVehicleApprovalStatus.PENDING,
                licensePlateImageUrls: [],
                registrationDocumentUrls: [],
                vehicleImageUrls: [],
            } as any);
            vehicleId = vehicle._id.toString();

            const vId = new Types.ObjectId(vehicleId);
            const uId = new Types.ObjectId(userId);

            const lpUrls = await this.saveRiderFiles(
                licensePlateFiles,
                FileCategory.RIDER_LICENSE_PLATE,
                vId,
                uId,
                uploadedPaths,
            );
            const docUrls = await this.saveRiderFiles(
                documentFiles,
                FileCategory.RIDER_REGISTRATION_DOC,
                vId,
                uId,
                uploadedPaths,
            );
            const vehUrls = await this.saveRiderFiles(
                vehicleFiles,
                FileCategory.RIDER_VEHICLE_PHOTO,
                vId,
                uId,
                uploadedPaths,
            );

            await this.riderVehicleRepository.update(vehicleId, {
                licensePlateImageUrls: lpUrls,
                registrationDocumentUrls: docUrls,
                vehicleImageUrls: vehUrls,
            } as any);

            const rider = await this.userRepository.findById(userId);
            await this.notificationService.notifyAdmins({
                title: 'New rider application',
                message: `${dto.firstName} ${dto.lastName} (${dto.email}) submitted a rider profile and vehicle for review.`,
                type: NotificationType.RIDER_APPLICATION,
                data: {
                    userId,
                    vehicleId,
                    email: dto.email.toLowerCase().trim(),
                },
            });

            return {
                message:
                    'Application submitted. You will be able to sign in after an administrator approves your account.',
                user: sanitizeUserUtils.sanitizeUser(rider),
                vehicleId,
            };
        } catch (err) {
            await this.rollbackRegistration(userId, vehicleId, uploadedPaths);
            throw err instanceof ConflictException || err instanceof BadRequestException
                ? err
                : new InternalServerErrorException(
                      err instanceof Error ? err.message : 'Failed to complete rider registration',
                  );
        }
    }

    /** Supports `name` and `name[]` keys (common for array uploads). */
    private mergeMultipartFiles(
        files: Record<string, Express.Multer.File[] | undefined>,
        baseName: string,
    ): Express.Multer.File[] {
        const a = files[baseName] ?? [];
        const b = files[`${baseName}[]`] ?? [];
        return [...a, ...b];
    }

    private assertImageUnderLimit(file: Express.Multer.File) {
        if (!ALLOWED_IMAGE_MIME.test(file.mimetype)) {
            throw new BadRequestException('Only JPG, JPEG, or PNG images are allowed');
        }
        if (file.size > MAX_IMAGE_BYTES) {
            throw new BadRequestException('Each image must be 3 MB or smaller');
        }
    }

    private async saveRiderFiles(
        fileList: Express.Multer.File[],
        category: FileCategory,
        vehicleObjectId: Types.ObjectId,
        userObjectId: Types.ObjectId,
        uploadedPaths: string[],
    ): Promise<string[]> {
        const urls: string[] = [];
        for (const file of fileList) {
            urls.push(await this.saveRiderFile(file, category, vehicleObjectId, userObjectId, uploadedPaths));
        }
        return urls;
    }

    private async saveRiderFile(
        file: Express.Multer.File,
        category: FileCategory,
        vehicleObjectId: Types.ObjectId,
        userObjectId: Types.ObjectId,
        uploadedPaths: string[],
    ): Promise<string> {
        const url = `/uploads/${file.filename}`;
        uploadedPaths.push(file.filename);
        await this.fileRepository.create({
            name: file.filename,
            originalName: file.originalname,
            path: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            type: FileType.IMAGE,
            category,
            fileableId: vehicleObjectId,
            fileableType: 'RiderVehicle',
            uploadedBy: userObjectId,
        });
        return url;
    }

    private async rollbackRegistration(
        userId: string | null,
        vehicleId: string | null,
        filenames: string[],
    ) {
        if (vehicleId) {
            try {
                await this.riderVehicleRepository.delete(vehicleId);
            } catch {
                /* ignore */
            }
        }
        if (userId) {
            try {
                await this.userRepository.delete(userId);
            } catch {
                /* ignore */
            }
        }
        for (const name of filenames) {
            if (!name || name.includes('..')) continue;
            try {
                await fs.unlink(path.join(process.cwd(), 'uploads', name));
            } catch {
                /* ignore */
            }
        }
    }
}
