import { Controller, Get, Param, Patch, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { ApprovalRejectDto } from '../dto/approval-reject.dto';
import { AdminRiderApprovalService } from '../services/admin-rider-approval.service';

@ApiTags('Admin — Rider approvals')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/pending-riders')
export class AdminPendingRidersController {
    constructor(private readonly adminRiderApprovalService: AdminRiderApprovalService) {}

    @Get()
    @ApiOperation({ summary: 'List riders awaiting approval' })
    async list(@Query() query: AdminListQueryDto) {
        return this.adminRiderApprovalService.listPendingRiders(query);
    }

    @Patch(':userId/approve')
    @ApiOperation({ summary: 'Approve rider account (sets status active)' })
    async approve(@Param('userId') userId: string) {
        return this.adminRiderApprovalService.approveRider(userId);
    }

    @Patch(':userId/reject')
    @ApiOperation({ summary: 'Reject rider application (and pending vehicles for this user)' })
    async reject(@Param('userId') userId: string, @Body() dto: ApprovalRejectDto) {
        return this.adminRiderApprovalService.rejectRider(userId, dto);
    }
}
