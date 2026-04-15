import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { RiderVehicleRepository } from 'src/shared/repositories/rider-vehicle.repository';
import { UserRole } from 'src/common/constants/user.constants';
import { UserStatus } from 'src/common/constants/user.constants';
import { DriverRegistrationListQueryDto } from '../dto/driver-registration-list-query.dto';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';

const REGISTRATION_USER_STATUSES: UserStatus[] = [
    UserStatus.PENDING_APPROVAL,
    UserStatus.REJECTED,
    UserStatus.ACTIVE,
    UserStatus.INACTIVE,
];

@Injectable()
export class AdminDriverRegistrationService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly riderVehicleRepository: RiderVehicleRepository,
    ) {}

    async listRegistrationRequests(query: DriverRegistrationListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const tab = query.status ?? 'all';
        const raw = await this.userRepository.paginateRiderRegistrationRequests(
            page,
            limit,
            query.search,
            tab,
        );
        return {
            ...raw,
            data: raw.data.map((u) => {
                const driver = sanitizeUserUtils.sanitizeUser(u);
                return {
                    ...driver,
                    registrationStatus: this.mapRegistrationStatus(u.status),
                };
            }),
        };
    }

    async getRegistrationRequestDetail(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('Registration request not found');
        }
        if (String(user.role) !== UserRole.RIDER) {
            throw new NotFoundException('Registration request not found');
        }
        if (!REGISTRATION_USER_STATUSES.includes(user.status as UserStatus)) {
            throw new NotFoundException('Registration request not found');
        }
        const vehicle = await this.riderVehicleRepository.findLatestByUserIdWithVehicleType(userId);
        const vehiclePayload = vehicle
            ? typeof (vehicle as any).toJSON === 'function'
                ? (vehicle as any).toJSON()
                : vehicle
            : null;

        return {
            registrationStatus: this.mapRegistrationStatus(user.status),
            driver: sanitizeUserUtils.sanitizeUser(user),
            vehicle: vehiclePayload,
            stats: {
                totalRides: 0,
                rating: null,
                totalEarning: null,
            },
            rideHistory: [],
        };
    }

    /** UI labels: pending (orange), rejected (red), approved (green). */
    private mapRegistrationStatus(status: string): 'pending' | 'rejected' | 'approved' {
        if (status === UserStatus.PENDING_APPROVAL) {
            return 'pending';
        }
        if (status === UserStatus.REJECTED) {
            return 'rejected';
        }
        return 'approved';
    }
}
