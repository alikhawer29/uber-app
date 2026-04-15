import { Controller, Get, Param, Patch, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { ApprovalRejectDto } from '../dto/approval-reject.dto';
import { AdminRiderApprovalService } from '../services/admin-rider-approval.service';

@ApiTags('Admin — Vehicle approvals (riders)')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/pending-vehicles')
export class AdminPendingVehiclesController {
    constructor(private readonly adminRiderApprovalService: AdminRiderApprovalService) {}

    @Get()
    @ApiOperation({ summary: 'List rider vehicles awaiting approval' })
    async list(@Query() query: AdminListQueryDto) {
        return this.adminRiderApprovalService.listPendingVehicles(query);
    }

    @Patch(':vehicleId/approve')
    @ApiOperation({ summary: 'Approve rider vehicle' })
    async approve(@Param('vehicleId') vehicleId: string) {
        return this.adminRiderApprovalService.approveVehicle(vehicleId);
    }

    @Patch(':vehicleId/reject')
    @ApiOperation({ summary: 'Reject rider vehicle' })
    async reject(@Param('vehicleId') vehicleId: string, @Body() dto: ApprovalRejectDto) {
        return this.adminRiderApprovalService.rejectVehicle(vehicleId, dto);
    }
}
