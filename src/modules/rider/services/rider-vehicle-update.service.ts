import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { RiderVehicleRepository } from 'src/shared/repositories/rider-vehicle.repository';
import { RiderVehicleUpdateRequestRepository } from 'src/shared/repositories/rider-vehicle-update-request.repository';
import { VehicleTypeRepository } from 'src/shared/repositories/vehicle-type.repository';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { RiderVehicleUpdateDto } from '../dto/rider-vehicle-update.dto';
import { UserRole } from 'src/common/constants/user.constants';
import { UserStatus } from 'src/common/constants/user.constants';
import { RiderVehicleUpdateRequestStatus } from 'src/common/constants/rider.constants';
import { FileType, FileCategory } from 'src/common/constants/file.constants';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { NotificationType } from 'src/shared/schemas/notification.schema';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = /^image\/(jpeg|jpg|pjpeg|png)$/i;
const MAX_IMAGES_PER_GROUP = 15;

@Injectable()
export class RiderVehicleUpdateService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly riderVehicleRepository: RiderVehicleRepository,
        private readonly updateRequestRepository: RiderVehicleUpdateRequestRepository,
        private readonly vehicleTypeRepository: VehicleTypeRepository,
        private readonly fileRepository: FileRepository,
        private readonly notificationService: NotificationService,
    ) {}

    /** Latest rider vehicle row with populated vehicle type (any approval status). */
    async getMyVehicle(userId: string) {
        const vehicle = await this.riderVehicleRepository.findLatestByUserIdWithVehicleType(userId);
        if (!vehicle) {
            throw new NotFoundException({
                code: 'VEHICLE_NOT_FOUND',
                message: 'No vehicle found for this account',
            });
        }
        const doc = vehicle as any;
        const vt = doc.vehicleTypeId;
        const vehicleType =
            vt && typeof vt === 'object' && vt.name !== undefined
                ? {
                      id: String(vt._id),
                      name: vt.name,
                      facilities: vt.facilities ?? [],
                      image: vt.image ?? null,
                  }
                : { id: String(vt) };

        return {
            success: true,
            data: {
                id: String(doc._id),
                vehicleType,
                brandName: doc.brandName,
                vehicleName: doc.vehicleName,
                vehicleColor: doc.vehicleColor,
                licensePlateNumber: doc.licensePlateNumber,
                approvalStatus: doc.approvalStatus,
                rejectionReason: doc.rejectionReason ?? null,
                licensePlateImageUrls: doc.licensePlateImageUrls ?? [],
                registrationDocumentUrls: doc.registrationDocumentUrls ?? [],
                vehicleImageUrls: doc.vehicleImageUrls ?? [],
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            },
        };
    }

    async submitVehicleUpdateRequest(
        userId: string,
        dto: RiderVehicleUpdateDto,
        files: Record<string, Express.Multer.File[] | undefined>,
    ) {
        const user = await this.userRepository.findById(userId);
        if (!user || String(user.role) !== UserRole.RIDER || user.status !== UserStatus.ACTIVE) {
            throw new BadRequestException('Only active riders can submit vehicle update requests');
        }

        const existingPending = await this.updateRequestRepository.findPendingByUserId(userId);
        if (existingPending) {
            throw new ConflictException('You already have a pending vehicle update request');
        }

        const vehicle = await this.riderVehicleRepository.findLatestApprovedByUserIdWithVehicleType(userId);
        if (!vehicle) {
            throw new BadRequestException('No approved vehicle found for this account');
        }

        const licensePlateFiles = this.mergeMultipartFiles(files, 'licensePlateImage');
        const documentFiles = this.mergeMultipartFiles(files, 'documentImage');
        const vehicleFiles = this.mergeMultipartFiles(files, 'vehicleImage');

        for (const group of [licensePlateFiles, documentFiles, vehicleFiles]) {
            if (group.length > MAX_IMAGES_PER_GROUP) {
                throw new BadRequestException(`At most ${MAX_IMAGES_PER_GROUP} images allowed per upload group`);
            }
            for (const f of group) {
                this.assertImageUnderLimit(f);
            }
        }

        const hasTextChange =
            dto.vehicleTypeId !== undefined ||
            dto.brandName !== undefined ||
            dto.vehicleName !== undefined ||
            dto.vehicleColor !== undefined ||
            dto.licensePlateNumber !== undefined;
        const hasFiles =
            licensePlateFiles.length > 0 || documentFiles.length > 0 || vehicleFiles.length > 0;
        if (!hasTextChange && !hasFiles) {
            throw new BadRequestException('Provide at least one updated field or image group');
        }

        let resolvedVehicleTypeId = vehicle.vehicleTypeId as Types.ObjectId;
        if (dto.vehicleTypeId !== undefined) {
            const vt = await this.vehicleTypeRepository.findById(dto.vehicleTypeId);
            if (!vt || !vt.isActive) {
                throw new BadRequestException('Invalid or inactive vehicle type');
            }
            resolvedVehicleTypeId = new Types.ObjectId(dto.vehicleTypeId);
        }

        const brandName = dto.brandName ?? vehicle.brandName;
        const vehicleName = dto.vehicleName ?? vehicle.vehicleName;
        const vehicleColor = dto.vehicleColor ?? vehicle.vehicleColor;
        const licensePlateNumber = (dto.licensePlateNumber ?? vehicle.licensePlateNumber).trim().toUpperCase();

        const vOid = vehicle._id as Types.ObjectId;
        const uOid = new Types.ObjectId(userId);
        const oldFilenames = this.collectStoredFilenames(vehicle);

        const lpUrls =
            licensePlateFiles.length > 0
                ? await this.saveRiderFiles(
                      licensePlateFiles,
                      FileCategory.RIDER_LICENSE_PLATE,
                      vOid,
                      uOid,
                  )
                : [...vehicle.licensePlateImageUrls];
        const docUrls =
            documentFiles.length > 0
                ? await this.saveRiderFiles(
                      documentFiles,
                      FileCategory.RIDER_REGISTRATION_DOC,
                      vOid,
                      uOid,
                  )
                : [...vehicle.registrationDocumentUrls];
        const vehUrls =
            vehicleFiles.length > 0
                ? await this.saveRiderFiles(vehicleFiles, FileCategory.RIDER_VEHICLE_PHOTO, vOid, uOid)
                : [...vehicle.vehicleImageUrls];

        const newUploadPaths = this.newUploadPathsFromUrls([...lpUrls, ...docUrls, ...vehUrls], oldFilenames);

        if (
            this.sameVehicleSnapshot(
                vehicle,
                resolvedVehicleTypeId,
                brandName,
                vehicleName,
                vehicleColor,
                licensePlateNumber,
                lpUrls,
                docUrls,
                vehUrls,
            )
        ) {
            await this.fileRepository.hardDeleteByStoredPaths(newUploadPaths);
            throw new BadRequestException('No changes detected compared to your current vehicle');
        }

        const email = (user.email ?? '').toLowerCase();
        const first = (user as any).firstName ?? '';
        const last = (user as any).lastName ?? '';
        const riderSearchText = `${email} ${first} ${last}`.trim().toLowerCase();

        try {
            await this.updateRequestRepository.create({
                userId: uOid,
                riderVehicleId: vOid,
                status: RiderVehicleUpdateRequestStatus.PENDING,
                riderSearchText,
                vehicleTypeId: resolvedVehicleTypeId,
                brandName,
                vehicleName,
                vehicleColor,
                licensePlateNumber,
                licensePlateImageUrls: lpUrls,
                registrationDocumentUrls: docUrls,
                vehicleImageUrls: vehUrls,
            } as any);

            await this.notificationService.notifyAdmins({
                title: 'Vehicle details update request',
                message: `${first} ${last} (${email}) submitted updated vehicle information for review.`,
                type: NotificationType.RIDER_VEHICLE_UPDATE_REQUEST,
                data: {
                    userId,
                    riderVehicleId: vOid.toString(),
                },
            });

            return {
                message: 'Vehicle update request submitted. An administrator will review your changes.',
            };
        } catch (err: unknown) {
            await this.fileRepository.hardDeleteByStoredPaths(newUploadPaths);
            const code = err && typeof err === 'object' && 'code' in err ? (err as { code: number }).code : 0;
            if (code === 11000) {
                throw new ConflictException('You already have a pending vehicle update request');
            }
            throw err instanceof BadRequestException || err instanceof ConflictException
                ? err
                : new InternalServerErrorException(
                      err instanceof Error ? err.message : 'Failed to submit vehicle update request',
                  );
        }
    }

    private collectStoredFilenames(vehicle: {
        licensePlateImageUrls: string[];
        registrationDocumentUrls: string[];
        vehicleImageUrls: string[];
    }): Set<string> {
        const s = new Set<string>();
        for (const u of [
            ...vehicle.licensePlateImageUrls,
            ...vehicle.registrationDocumentUrls,
            ...vehicle.vehicleImageUrls,
        ]) {
            const f = this.storedPathFromUrl(u);
            if (f) s.add(f);
        }
        return s;
    }

    private storedPathFromUrl(url: string): string {
        return url.replace(/^\/uploads\//, '').replace(/^uploads\//, '').replace(/^\//, '');
    }

    private newUploadPathsFromUrls(urls: string[], oldFilenames: Set<string>): string[] {
        const out: string[] = [];
        for (const u of urls) {
            const f = this.storedPathFromUrl(u);
            if (f && !oldFilenames.has(f)) out.push(f);
        }
        return out;
    }

    private sameVehicleSnapshot(
        vehicle: {
            vehicleTypeId: Types.ObjectId;
            brandName: string;
            vehicleName: string;
            vehicleColor: string;
            licensePlateNumber: string;
            licensePlateImageUrls: string[];
            registrationDocumentUrls: string[];
            vehicleImageUrls: string[];
        },
        vehicleTypeId: Types.ObjectId,
        brandName: string,
        vehicleName: string,
        vehicleColor: string,
        licensePlateNumber: string,
        lpUrls: string[],
        docUrls: string[],
        vehUrls: string[],
    ): boolean {
        if (String(vehicle.vehicleTypeId) !== String(vehicleTypeId)) return false;
        if (vehicle.brandName !== brandName) return false;
        if (vehicle.vehicleName !== vehicleName) return false;
        if (vehicle.vehicleColor !== vehicleColor) return false;
        if (vehicle.licensePlateNumber.trim().toUpperCase() !== licensePlateNumber) return false;
        if (!this.sameStringArray(vehicle.licensePlateImageUrls, lpUrls)) return false;
        if (!this.sameStringArray(vehicle.registrationDocumentUrls, docUrls)) return false;
        if (!this.sameStringArray(vehicle.vehicleImageUrls, vehUrls)) return false;
        return true;
    }

    private sameStringArray(a: string[], b: string[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((v, i) => v === b[i]);
    }

    private mergeMultipartFiles(
        fileMap: Record<string, Express.Multer.File[] | undefined>,
        baseName: string,
    ): Express.Multer.File[] {
        const a = fileMap[baseName] ?? [];
        const b = fileMap[`${baseName}[]`] ?? [];
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
    ): Promise<string[]> {
        const urls: string[] = [];
        for (const file of fileList) {
            urls.push(await this.saveRiderFile(file, category, vehicleObjectId, userObjectId));
        }
        return urls;
    }

    private async saveRiderFile(
        file: Express.Multer.File,
        category: FileCategory,
        vehicleObjectId: Types.ObjectId,
        userObjectId: Types.ObjectId,
    ): Promise<string> {
        const url = `/uploads/${file.filename}`;
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
}
