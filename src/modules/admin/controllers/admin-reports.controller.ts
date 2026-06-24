import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminReportListQueryDto } from '../dto/admin-report-list-query.dto';
import { AdminReportsService } from '../services/admin-reports.service';

@ApiTags('Admin — Reports')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/reports')
export class AdminReportsController {
    constructor(private readonly adminReportsService: AdminReportsService) {}

    @Get()
    @ApiOperation({ summary: 'List ride reports/complaints with search, status filter, and pagination' })
    async list(@Query() query: AdminReportListQueryDto) {
        return this.adminReportsService.list(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get report details' })
    async getOne(@Param('id') id: string) {
        return this.adminReportsService.getById(id);
    }

    @Patch(':id/resolve')
    @ApiOperation({ summary: 'Mark report as resolved' })
    async resolve(@Param('id') id: string, @CurrentUser() admin: { id: string }) {
        return this.adminReportsService.resolve(id, admin.id);
    }
}
