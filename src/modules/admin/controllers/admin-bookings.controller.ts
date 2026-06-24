import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminBookingListQueryDto } from '../dto/admin-booking-list-query.dto';
import { AdminBookingsService } from '../services/admin-bookings.service';

@ApiTags('Admin — Bookings')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
    constructor(private readonly adminBookingsService: AdminBookingsService) {}

    @Get()
    @ApiOperation({ summary: 'List bookings with search, status filter, and pagination' })
    async list(@Query() query: AdminBookingListQueryDto) {
        return this.adminBookingsService.list(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get booking details' })
    async getOne(@Param('id') id: string) {
        return this.adminBookingsService.getById(id);
    }
}
