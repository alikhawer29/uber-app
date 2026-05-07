import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminContactUsListQueryDto } from '../dto/admin-contact-us-list-query.dto';
import { AdminContactUsService } from '../services/admin-contact-us.service';

@ApiTags('Admin — Contact us')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/contact-us')
export class AdminContactUsController {
    constructor(private readonly adminContactUsService: AdminContactUsService) {}

    @Get()
    @ApiOperation({
        summary: 'List contact us submissions',
        description: 'Paginated list from passenger and rider apps. Optional `senderRole` and `search`.',
    })
    async list(@Query() query: AdminContactUsListQueryDto) {
        return this.adminContactUsService.list(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one contact us submission by id' })
    async getOne(@Param('id') id: string) {
        return this.adminContactUsService.getById(id);
    }
}
