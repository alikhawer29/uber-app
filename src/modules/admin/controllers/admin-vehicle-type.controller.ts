import {
    Body,
    Controller,
    Delete,
    Get,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { multerConfig } from 'src/config/multer.config';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminVehicleTypeService } from '../services/admin-vehicle-type.service';
import { CreateVehicleTypeDto } from '../dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from '../dto/update-vehicle-type.dto';
import { AdminListQueryDto } from '../dto/list-query.dto';

@ApiTags('Admin — Vehicle types')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/vehicle-types')
export class AdminVehicleTypeController {
    constructor(private readonly adminVehicleTypeService: AdminVehicleTypeService) {}

    @Get()
    @ApiOperation({ summary: 'List vehicle types (paginated)' })
    async list(@Query() query: AdminListQueryDto) {
        return this.adminVehicleTypeService.list(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get vehicle type by id' })
    async getById(@Param('id') id: string) {
        return this.adminVehicleTypeService.getById(id);
    }

    @Post()
    @UseInterceptors(FileInterceptor('image', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['name', 'facilities'],
            properties: {
                name: { type: 'string' },
                facilities: { type: 'string' },
                sortOrder: { type: 'number' },
                image: { type: 'string', format: 'binary' },
            },
        },
    })
    @ApiOperation({ summary: 'Create vehicle type' })
    async create(
        @Body() dto: CreateVehicleTypeDto,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
            }),
        )
        image?: Express.Multer.File,
    ) {
        return this.adminVehicleTypeService.create(dto, image);
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('image', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                facilities: { type: 'string' },
                sortOrder: { type: 'number' },
                image: { type: 'string', format: 'binary' },
            },
        },
    })
    @ApiOperation({ summary: 'Update vehicle type' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateVehicleTypeDto,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
            }),
        )
        image?: Express.Multer.File,
    ) {
        return this.adminVehicleTypeService.update(id, dto, image);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deactivate vehicle type' })
    @ApiResponse({ status: 200, description: 'Vehicle type deactivated' })
    async remove(@Param('id') id: string) {
        return this.adminVehicleTypeService.remove(id);
    }
}
