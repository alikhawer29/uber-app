import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { DriverRegistrationListQueryDto } from '../dto/driver-registration-list-query.dto';
import { AdminDriverRegistrationService } from '../services/admin-driver-registration.service';

@ApiTags('Admin — Driver registration requests')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/driver-registration-requests')
export class AdminDriverRegistrationController {
    constructor(private readonly adminDriverRegistrationService: AdminDriverRegistrationService) {}

    @Get()
    @ApiOperation({
        summary: 'List driver (rider) registration requests',
        description:
            'Pending and rejected applications. Approved drivers leave this queue and appear under admin drivers. Optional `status`: all (default), pending, rejected. Each row includes `registrationStatus`.',
    })
    async list(@Query() query: DriverRegistrationListQueryDto) {
        return this.adminDriverRegistrationService.listRegistrationRequests(query);
    }

    @Get(':userId')
    @ApiOperation({
        summary: 'View a single driver registration request',
        description:
            'Pending or rejected application. Approved drivers return 404 here (use admin drivers). Includes driver, vehicle, placeholder `stats`, and empty `rideHistory`.',
    })
    async getOne(@Param('userId') userId: string) {
        return this.adminDriverRegistrationService.getRegistrationRequestDetail(userId);
    }
}
