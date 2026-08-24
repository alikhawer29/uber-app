import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MultipartFormFieldsInterceptor } from 'src/common/interceptors/multipart-form-fields.interceptor';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminFareService } from '../services/admin-fare.service';
import { CreateFareDto } from '../dto/create-fare.dto';
import { UpdateFareDto } from '../dto/update-fare.dto';
import { AdminListQueryDto } from '../dto/list-query.dto';

@ApiTags('Admin — Fares')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseInterceptors(MultipartFormFieldsInterceptor)
@Controller('admin/fares')
export class AdminFareController {
    constructor(private readonly adminFareService: AdminFareService) {}

    @Get()
    @ApiOperation({ summary: 'List fares with populated vehicle type (paginated, optional search on type)' })
    async list(@Query() query: AdminListQueryDto) {
        return this.adminFareService.list(query);
    }

    @Get('vehicle-type/:vehicleTypeId')
    @ApiOperation({ summary: 'Get fare by vehicle type id' })
    async getByVehicleType(@Param('vehicleTypeId') vehicleTypeId: string) {
        return this.adminFareService.getByVehicleTypeId(vehicleTypeId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get fare by id' })
    async getById(@Param('id') id: string) {
        return this.adminFareService.getById(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create fare for a vehicle type (one fare per type)' })
    async create(@Body() dto: CreateFareDto) {
        return this.adminFareService.create(dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update fare' })
    async updatePatch(@Param('id') id: string, @Body() dto: UpdateFareDto) {
        return this.adminFareService.update(id, dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update fare (same as PATCH; used by admin UI)' })
    async updatePut(@Param('id') id: string, @Body() dto: UpdateFareDto) {
        return this.adminFareService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deactivate fare' })
    async remove(@Param('id') id: string) {
        return this.adminFareService.remove(id);
    }
}
