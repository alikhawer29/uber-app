import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { DriverListQueryDto } from '../dto/driver-list-query.dto';
import { UpdateDriverStatusDto } from '../dto/update-driver-status.dto';
import { AdminDriversService } from '../services/admin-drivers.service';

@ApiTags('Admin — Drivers')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/drivers')
export class AdminDriversController {
    constructor(private readonly adminDriversService: AdminDriversService) {}

    @Get()
    @ApiOperation({
        summary: 'List approved drivers (riders)',
        description:
            'Returns riders with status active or inactive (post-approval). Query `status` filters; `search` matches name or email.',
    })
    async list(@Query() query: DriverListQueryDto) {
        return this.adminDriversService.list(query);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get one driver with linked vehicle' })
    async getOne(@Param('userId') userId: string) {
        return this.adminDriversService.getDriver(userId);
    }

    @Patch(':userId/status')
    @ApiOperation({
        summary: 'Set driver active or inactive',
        description: 'Uses UserStatus.active / UserStatus.inactive (same as project user status pattern).',
    })
    async updateStatus(@Param('userId') userId: string, @Body() dto: UpdateDriverStatusDto) {
        return this.adminDriversService.updateStatus(userId, dto);
    }
}
