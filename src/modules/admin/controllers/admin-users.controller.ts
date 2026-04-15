import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminUserListQueryDto } from '../dto/admin-user-list-query.dto';
import { UpdateAdminUserStatusDto } from '../dto/update-admin-user-status.dto';
import { AdminUsersService } from '../services/admin-users.service';

@ApiTags('Admin — Users (passengers)')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
    constructor(private readonly adminUsersService: AdminUsersService) {}

    @Get()
    @ApiOperation({
        summary: 'List app users (passengers)',
        description:
            'Paginated `role: user` accounts (active, inactive, or suspended). Search matches email, first name, last name, or phone.',
    })
    async list(@Query() query: AdminUserListQueryDto) {
        return this.adminUsersService.list(query);
    }

    @Get(':userId')
    @ApiOperation({
        summary: 'User details',
        description:
            'Profile for one passenger (`role: user`). Includes placeholder `stats` and `rideLogs` until bookings exist.',
    })
    async getOne(@Param('userId') userId: string) {
        return this.adminUsersService.getUser(userId);
    }

    @Patch(':userId/status')
    @ApiOperation({
        summary: 'Set user active or inactive',
        description: 'Only `active` or `inactive` are allowed (matches admin users UI).',
    })
    async updateStatus(@Param('userId') userId: string, @Body() dto: UpdateAdminUserStatusDto) {
        return this.adminUsersService.updateStatus(userId, dto);
    }
}
