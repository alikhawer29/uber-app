import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { VehicleUpdateRequestListQueryDto } from '../dto/vehicle-update-request-list-query.dto';
import { ApprovalRejectDto } from '../dto/approval-reject.dto';
import { AdminVehicleUpdateRequestService } from '../services/admin-vehicle-update-request.service';

@ApiTags('Admin — Vehicle update requests')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/vehicle-update-requests')
export class AdminVehicleUpdateRequestsController {
    constructor(private readonly adminVehicleUpdateRequestService: AdminVehicleUpdateRequestService) {}

    @Get()
    @ApiOperation({ summary: 'List rider vehicle detail update requests' })
    async list(@Query() query: VehicleUpdateRequestListQueryDto) {
        return this.adminVehicleUpdateRequestService.list(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Vehicle update request detail (current vs proposed)' })
    async detail(@Param('id') id: string) {
        return this.adminVehicleUpdateRequestService.getDetail(id);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve and apply proposed vehicle data to the main RiderVehicle' })
    async approve(@Param('id') id: string) {
        return this.adminVehicleUpdateRequestService.approve(id);
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Reject vehicle update request (optional reason)' })
    async reject(@Param('id') id: string, @Body() dto: ApprovalRejectDto) {
        return this.adminVehicleUpdateRequestService.reject(id, dto);
    }
}
