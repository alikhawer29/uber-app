import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminQueryListQueryDto } from '../dto/admin-query-list-query.dto';
import { AdminQueriesService } from '../services/admin-queries.service';

@ApiTags('Admin — Queries')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/queries')
export class AdminQueriesController {
    constructor(private readonly adminQueriesService: AdminQueriesService) {}

    @Get()
    @ApiOperation({ summary: 'List contact queries with search, type filter, and pagination' })
    async list(@Query() query: AdminQueryListQueryDto) {
        return this.adminQueriesService.list(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get query details' })
    async getOne(@Param('id') id: string) {
        return this.adminQueriesService.getById(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a query' })
    async remove(@Param('id') id: string) {
        return this.adminQueriesService.delete(id);
    }
}
