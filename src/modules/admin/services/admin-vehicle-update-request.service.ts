import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RiderVehicleUpdateRequestRepository } from 'src/shared/repositories/rider-vehicle-update-request.repository';
import { RiderVehicleRepository } from 'src/shared/repositories/rider-vehicle.repository';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { RiderVehicleUpdateRequestStatus } from 'src/common/constants/rider.constants';
import { VehicleUpdateRequestListQueryDto } from '../dto/vehicle-update-request-list-query.dto';
import { ApprovalRejectDto } from '../dto/approval-reject.dto';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { NotificationType } from 'src/shared/schemas/notification.schema';

@Injectable()
export class AdminVehicleUpdateRequestService {
    constructor(
        private readonly updateRequestRepository: RiderVehicleUpdateRequestRepository,
        private readonly riderVehicleRepository: RiderVehicleRepository,
        private readonly fileRepository: FileRepository,
        private readonly notificationService: NotificationService,
    ) {}

    async list(query: VehicleUpdateRequestListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const tab = query.status ?? 'all';
        const raw = await this.updateRequestRepository.paginateForAdmin(page, limit, tab, query.search);
        return {
            ...raw,
            data: raw.data.map((row: any) => {
                const u = row.userId;
                const driverName =
                    u && typeof u === 'object'
                        ? `${(u.firstName ?? '').toString().trim()} ${(u.lastName ?? '').toString().trim()}`.trim()
                        : '';
                return {
                    id: row._id?.toString?.() ?? String(row._id),
                    status: row.status,
                    driverName: driverName || '—',
                    email: u && typeof u === 'object' ? u.email : undefined,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                };
            }),
        };
    }

    async getDetail(id: string) {
        const reqDoc = await this.updateRequestRepository.findByIdWithRelations(id);
        if (!reqDoc) {
            throw new NotFoundException('Vehicle update request not found');
        }
        const vehicle = await this.riderVehicleRepository.findByIdWithRelations(
            String((reqDoc as any).riderVehicleId?._id ?? (reqDoc as any).riderVehicleId),
        );
        if (!vehicle) {
            throw new NotFoundException('Linked vehicle not found');
        }
        const vehicleOwnerId = this.resolveRefId((vehicle as any).userId);
        const requestUserId = this.resolveRefId((reqDoc as any).userId);
        if (!vehicleOwnerId || !requestUserId || vehicleOwnerId !== requestUserId) {
            throw new BadRequestException('Request data is inconsistent');
        }

        const currentVehicle =
            typeof (vehicle as any).toJSON === 'function' ? (vehicle as any).toJSON() : vehicle;
        const reqJson = typeof (reqDoc as any).toJSON === 'function' ? (reqDoc as any).toJSON() : reqDoc;
        const proposedVehicle = {
            vehicleTypeId: reqJson.vehicleTypeId,
            brandName: reqJson.brandName,
            vehicleName: reqJson.vehicleName,
            vehicleColor: reqJson.vehicleColor,
            licensePlateNumber: reqJson.licensePlateNumber,
            licensePlateImageUrls: reqJson.licensePlateImageUrls,
            registrationDocumentUrls: reqJson.registrationDocumentUrls,
            vehicleImageUrls: reqJson.vehicleImageUrls,
        };

        const riderRaw = (reqDoc as any).userId;
        const rider =
            riderRaw && typeof riderRaw === 'object' ? sanitizeUserUtils.sanitizeUser(riderRaw as any) : null;

        return {
            id: (reqDoc as any)._id?.toString?.() ?? String((reqDoc as any)._id),
            status: reqDoc.status,
            rejectionReason: reqDoc.rejectionReason,
            createdAt: (reqDoc as any).createdAt,
            updatedAt: (reqDoc as any).updatedAt,
            rider,
            currentVehicle,
            proposedVehicle,
        };
    }

    async approve(id: string) {
        const reqDoc = await this.updateRequestRepository.findById(id);
        if (!reqDoc) {
            throw new NotFoundException('Vehicle update request not found');
        }
        if (reqDoc.status !== RiderVehicleUpdateRequestStatus.PENDING) {
            throw new BadRequestException('This request is not pending');
        }
        const vehicle = await this.riderVehicleRepository.findById(String(reqDoc.riderVehicleId));
        if (!vehicle) {
            throw new NotFoundException('Vehicle not found');
        }
        if (this.resolveRefId(vehicle.userId as any) !== this.resolveRefId(reqDoc.userId as any)) {
            throw new BadRequestException('Request does not match vehicle owner');
        }

        await this.riderVehicleRepository.update(String(vehicle._id), {
            vehicleTypeId: reqDoc.vehicleTypeId,
            brandName: reqDoc.brandName,
            vehicleName: reqDoc.vehicleName,
            vehicleColor: reqDoc.vehicleColor,
            licensePlateNumber: reqDoc.licensePlateNumber,
            licensePlateImageUrls: reqDoc.licensePlateImageUrls,
            registrationDocumentUrls: reqDoc.registrationDocumentUrls,
            vehicleImageUrls: reqDoc.vehicleImageUrls,
        } as any);

        await this.updateRequestRepository.update(id, {
            status: RiderVehicleUpdateRequestStatus.APPROVED,
            rejectionReason: null,
        } as any);

        const riderId = this.resolveRefId(reqDoc.userId as any);
        await this.notificationService.notifyUserNonBlocking({
            recipientId: riderId,
            title: 'Vehicle update approved',
            message: 'Your requested vehicle detail changes have been approved and are now live on your profile.',
            type: NotificationType.RIDER_VEHICLE_UPDATE_APPROVED,
            data: { requestId: id, vehicleId: String(vehicle._id) },
        });

        return { message: 'Vehicle update approved and applied', id };
    }

    async reject(id: string, dto: ApprovalRejectDto) {
        const reqDoc = await this.updateRequestRepository.findById(id);
        if (!reqDoc) {
            throw new NotFoundException('Vehicle update request not found');
        }
        if (reqDoc.status !== RiderVehicleUpdateRequestStatus.PENDING) {
            throw new BadRequestException('This request is not pending');
        }
        const vehicle = await this.riderVehicleRepository.findById(String(reqDoc.riderVehicleId));
        if (vehicle) {
            const oldSet = this.collectStoredFilenames(vehicle);
            const orphanPaths = this.newUploadPathsFromUrls(
                [
                    ...reqDoc.licensePlateImageUrls,
                    ...reqDoc.registrationDocumentUrls,
                    ...reqDoc.vehicleImageUrls,
                ],
                oldSet,
            );
            await this.fileRepository.hardDeleteByStoredPaths(orphanPaths);
        }
        const reason = dto.reason?.trim();
        await this.updateRequestRepository.update(id, {
            status: RiderVehicleUpdateRequestStatus.REJECTED,
            rejectionReason: reason || undefined,
        } as any);

        const riderId = this.resolveRefId(reqDoc.userId as any);
        const reasonLine = reason ? ` Reason: ${reason}` : '';
        await this.notificationService.notifyUserNonBlocking({
            recipientId: riderId,
            title: 'Vehicle update not approved',
            message: `Your vehicle detail update request was not approved.${reasonLine}`.trim(),
            type: NotificationType.RIDER_VEHICLE_UPDATE_REJECTED,
            data: { requestId: id, reason: reason || undefined },
        });

        return { message: 'Vehicle update request rejected', id };
    }

    /**
     * `userId` may be an ObjectId, a populated User doc, or a string (after transforms).
     */
    private resolveRefId(ref: unknown): string {
        if (ref == null || ref === '') {
            return '';
        }
        if (typeof ref === 'string' || typeof ref === 'number') {
            return String(ref);
        }
        if (typeof ref === 'object') {
            const r = ref as Record<string, unknown> & { toString?: () => string };
            const ctor = (r as { constructor?: { name?: string } }).constructor?.name;
            if (r._bsontype === 'ObjectId' || ctor === 'ObjectId') {
                return typeof r.toString === 'function' ? r.toString() : String(ref);
            }
            if (r._id != null) {
                return this.resolveRefId(r._id);
            }
            if (typeof r.id === 'string' && r.id.length > 0) {
                return r.id;
            }
        }
        return typeof ref === 'object' && typeof (ref as { toString?: () => string }).toString === 'function'
            ? (ref as { toString: () => string }).toString()
            : String(ref);
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
}
