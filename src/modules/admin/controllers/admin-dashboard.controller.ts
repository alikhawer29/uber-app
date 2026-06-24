import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminDashboardRevenueQueryDto } from '../dto/admin-dashboard-revenue-query.dto';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@ApiTags('Admin — Dashboard')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/dashboard')
export class AdminDashboardController {
    constructor(private readonly adminDashboardService: AdminDashboardService) {}

    @Get('stats')
    @ApiOperation({ summary: 'Dashboard summary cards and sparkline data' })
    async stats() {
        return this.adminDashboardService.getStats();
    }

    @Get('revenue-graph')
    @ApiOperation({ summary: 'Revenue analytics chart (monthly / 6 months / yearly)' })
    async revenueGraph(@Query() query: AdminDashboardRevenueQueryDto) {
        return this.adminDashboardService.getRevenueGraph(query);
    }
}
