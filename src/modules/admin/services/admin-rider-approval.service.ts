import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { RiderVehicleRepository } from 'src/shared/repositories/rider-vehicle.repository';
import { UserRole } from 'src/common/constants/user.constants';
import { UserStatus } from 'src/common/constants/user.constants';
import { RiderVehicleApprovalStatus } from 'src/common/constants/rider.constants';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { ApprovalRejectDto } from '../dto/approval-reject.dto';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { NotificationType } from 'src/shared/schemas/notification.schema';

@Injectable()
export class AdminRiderApprovalService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly riderVehicleRepository: RiderVehicleRepository,
        private readonly notificationService: NotificationService,
    ) {}

    async listPendingRiders(query: AdminListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        return this.userRepository.paginateByRoleAndStatus(
            page,
            limit,
            UserRole.RIDER,
            UserStatus.PENDING_APPROVAL,
        );
    }

    async listPendingVehicles(query: AdminListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        return this.riderVehicleRepository.paginateByApprovalStatus(
            page,
            limit,
            RiderVehicleApprovalStatus.PENDING,
        );
    }

    async approveRider(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (String(user.role) !== UserRole.RIDER) {
            throw new BadRequestException('User is not a rider');
        }
        if (user.status !== UserStatus.PENDING_APPROVAL) {
            throw new BadRequestException('Rider is not awaiting approval');
        }
        const updated = await this.userRepository.update(userId, {
            status: UserStatus.ACTIVE,
            applicationRejectionReason: null,
        } as any);
        if (!updated) {
            throw new NotFoundException('User not found');
        }
        await this.riderVehicleRepository.approveAllPendingForUser(userId);
        const name = `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim() || 'Driver';
        await this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Application approved',
            message: `Hi ${name}, your driver application has been approved. You can sign in and start using the app.`,
            type: NotificationType.RIDER_APPLICATION_APPROVED,
            data: { userId },
        });
        return { message: 'Rider and pending vehicle(s) approved', userId };
    }

    async rejectRider(userId: string, dto: ApprovalRejectDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (String(user.role) !== UserRole.RIDER) {
            throw new BadRequestException('User is not a rider');
        }
        if (user.status !== UserStatus.PENDING_APPROVAL) {
            throw new BadRequestException('Rider is not awaiting approval');
        }
        const reason = dto.reason?.trim();
        await this.userRepository.update(userId, {
            status: UserStatus.REJECTED,
            applicationRejectionReason: reason || undefined,
        } as any);
        await this.riderVehicleRepository.rejectAllPendingForUser(userId, reason);
        const name = `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim() || 'Driver';
        const reasonLine = reason ? ` Reason: ${reason}` : '';
        await this.notificationService.notifyUserNonBlocking({
            recipientId: userId,
            title: 'Application not approved',
            message: `Hi ${name}, your driver application was not approved.${reasonLine}`.trim(),
            type: NotificationType.RIDER_APPLICATION_REJECTED,
            data: { userId, reason: reason || undefined },
        });
        return { message: 'Rider application rejected', userId };
    }

    async approveVehicle(vehicleId: string) {
        const vehicle = await this.riderVehicleRepository.findById(vehicleId);
        if (!vehicle) {
            throw new NotFoundException('Vehicle record not found');
        }
        if (vehicle.approvalStatus !== RiderVehicleApprovalStatus.PENDING) {
            throw new BadRequestException('Vehicle is not awaiting approval');
        }
        const updated = await this.riderVehicleRepository.update(vehicleId, {
            approvalStatus: RiderVehicleApprovalStatus.APPROVED,
            rejectionReason: null,
        } as any);
        if (!updated) {
            throw new NotFoundException('Vehicle record not found');
        }
        const riderId = String(vehicle.userId);
        await this.notificationService.notifyUserNonBlocking({
            recipientId: riderId,
            title: 'Vehicle approved',
            message:
                'Your submitted vehicle has been approved. If your account was already active, you can continue driving.',
            type: NotificationType.RIDER_VEHICLE_REGISTRATION_APPROVED,
            data: { vehicleId },
        });
        return { message: 'Vehicle approved', vehicleId };
    }

    async rejectVehicle(vehicleId: string, dto: ApprovalRejectDto) {
        const vehicle = await this.riderVehicleRepository.findById(vehicleId);
        if (!vehicle) {
            throw new NotFoundException('Vehicle record not found');
        }
        if (vehicle.approvalStatus !== RiderVehicleApprovalStatus.PENDING) {
            throw new BadRequestException('Vehicle is not awaiting approval');
        }
        const reason = dto.reason?.trim();
        await this.riderVehicleRepository.update(vehicleId, {
            approvalStatus: RiderVehicleApprovalStatus.REJECTED,
            rejectionReason: reason || undefined,
        } as any);
        const riderId = String(vehicle.userId);
        const reasonLine = reason ? ` Reason: ${reason}` : '';
        await this.notificationService.notifyUserNonBlocking({
            recipientId: riderId,
            title: 'Vehicle not approved',
            message: `Your submitted vehicle was not approved.${reasonLine}`.trim(),
            type: NotificationType.RIDER_VEHICLE_REGISTRATION_REJECTED,
            data: { vehicleId, reason: reason || undefined },
        });
        return { message: 'Vehicle application rejected', vehicleId };
    }
}
