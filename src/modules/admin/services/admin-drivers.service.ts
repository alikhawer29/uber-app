import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { RiderVehicleRepository } from 'src/shared/repositories/rider-vehicle.repository';
import { UserRole } from 'src/common/constants/user.constants';
import { UserStatus } from 'src/common/constants/user.constants';
import { DriverListQueryDto } from '../dto/driver-list-query.dto';
import { UpdateDriverStatusDto } from '../dto/update-driver-status.dto';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';

@Injectable()
export class AdminDriversService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly riderVehicleRepository: RiderVehicleRepository,
    ) {}

    async list(query: DriverListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const statusFilter = query.status ?? 'all';
        return this.userRepository.paginateApprovedRiders(page, limit, query.search, statusFilter);
    }

    async getDriver(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('Driver not found');
        }
        if (String(user.role) !== UserRole.RIDER) {
            throw new NotFoundException('Driver not found');
        }
        if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.INACTIVE) {
            throw new NotFoundException('Driver not found');
        }
        const vehicle = await this.riderVehicleRepository.findByUserId(userId);
        return {
            driver: sanitizeUserUtils.sanitizeUser(user),
            vehicle: vehicle ? vehicle.toJSON?.() ?? vehicle : null,
        };
    }

    async updateStatus(userId: string, dto: UpdateDriverStatusDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('Driver not found');
        }
        if (String(user.role) !== UserRole.RIDER) {
            throw new NotFoundException('Driver not found');
        }
        if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.INACTIVE) {
            throw new BadRequestException(
                'Only approved drivers (active or inactive) can be updated from this screen',
            );
        }
        const updated = await this.userRepository.update(userId, { status: dto.status } as any);
        if (!updated) {
            throw new NotFoundException('Driver not found');
        }
        return {
            message: `Driver status set to ${dto.status}`,
            userId,
            status: dto.status,
            driver: sanitizeUserUtils.sanitizeUser(updated),
        };
    }
}
