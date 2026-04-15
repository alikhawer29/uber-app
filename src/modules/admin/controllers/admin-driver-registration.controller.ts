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
            'Paginated riders with registration lifecycle: pending, rejected, or approved (active/inactive). Each row includes `registrationStatus` for UI (pending / rejected / approved). Use `admin/pending-riders` approve/reject actions for pending applications.',
    })
    async list(@Query() query: DriverRegistrationListQueryDto) {
        return this.adminDriverRegistrationService.listRegistrationRequests(query);
    }

    @Get(':userId')
    @ApiOperation({
        summary: 'View a single driver registration request',
        description:
            'Driver profile, linked vehicle (with vehicle type), image URL arrays on vehicle, placeholder `stats` and empty `rideHistory` until bookings are implemented.',
    })
    async getOne(@Param('userId') userId: string) {
        return this.adminDriverRegistrationService.getRegistrationRequestDetail(userId);
    }
}
