import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserRole } from 'src/common/constants/user.constants';
import { UserStatus } from 'src/common/constants/user.constants';
import { AdminUserListQueryDto } from '../dto/admin-user-list-query.dto';
import { UpdateAdminUserStatusDto } from '../dto/update-admin-user-status.dto';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';

@Injectable()
export class AdminUsersService {
    constructor(private readonly userRepository: UserRepository) {}

    async list(query: AdminUserListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const statusFilter = query.status ?? 'all';
        const raw = await this.userRepository.paginateAdminAppUsers(page, limit, query.search, statusFilter);
        return {
            ...raw,
            data: raw.data.map((u) => sanitizeUserUtils.sanitizeUser(u)),
        };
    }

    async getUser(userId: string) {
        const user = await this.userRepository.findByIdWithAvatar(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (String(user.role) !== UserRole.USER) {
            throw new NotFoundException('User not found');
        }
        if (user.deletedAt) {
            throw new NotFoundException('User not found');
        }
        return {
            user: sanitizeUserUtils.sanitizeUser(user),
            stats: {
                totalTripsTaken: 0,
            },
            rideLogs: {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
                message: 'Ride history will appear here when bookings are available.',
            },
        };
    }

    async updateStatus(userId: string, dto: UpdateAdminUserStatusDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (String(user.role) !== UserRole.USER) {
            throw new NotFoundException('User not found');
        }
        if (user.deletedAt) {
            throw new NotFoundException('User not found');
        }
        if (
            user.status !== UserStatus.ACTIVE &&
            user.status !== UserStatus.INACTIVE &&
            user.status !== UserStatus.SUSPENDED
        ) {
            throw new BadRequestException('This account cannot be updated from the users screen');
        }
        const updated = await this.userRepository.update(userId, { status: dto.status } as any);
        if (!updated) {
            throw new NotFoundException('User not found');
        }
        const withAvatar = await this.userRepository.findByIdWithAvatar(userId);
        return {
            message: `User status set to ${dto.status}`,
            userId,
            status: dto.status,
            user: sanitizeUserUtils.sanitizeUser(withAvatar ?? updated),
        };
    }
}
