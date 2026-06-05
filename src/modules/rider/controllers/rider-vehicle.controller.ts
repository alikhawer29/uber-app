import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Req,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { multerConfig } from 'src/config/multer.config';
import { RiderVehicleUpdateDto } from '../dto/rider-vehicle-update.dto';
import { RiderAddVehicleDto } from '../dto/rider-add-vehicle.dto';
import { RiderVehicleUpdateService } from '../services/rider-vehicle-update.service';

const MAX_IMAGES_PER_FIELD = 15;

@ApiTags('Rider — Vehicle')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider/vehicle')
export class RiderVehicleController {
    constructor(private readonly riderVehicleUpdateService: RiderVehicleUpdateService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'licensePlateImage', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'licensePlateImage[]', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'documentImage', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'documentImage[]', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'vehicleImage', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'vehicleImage[]', maxCount: MAX_IMAGES_PER_FIELD },
            ],
            multerConfig,
        ),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: RiderAddVehicleDto })
    @ApiOperation({
        summary: 'Add / register vehicle (existing active rider)',
        description:
            'Use when you have no vehicle or your last vehicle was rejected. Requires all text fields and at least one image per group. Admin must approve before you can use update-request.',
    })
    @ApiResponse({ status: 201, description: 'Vehicle submitted for approval' })
    addVehicle(
        @CurrentUser() rider: { id: string },
        @Body() dto: RiderAddVehicleDto,
        @UploadedFiles() files: Record<string, Express.Multer.File[] | undefined>,
    ) {
        return this.riderVehicleUpdateService.registerVehicle(rider.id, dto, files ?? {});
    }

    @Get()
    @ApiOperation({
        summary: 'Get current rider vehicle',
        description:
            'Returns the latest registered vehicle for this account, including vehicle type (name, facilities, image) and approval status.',
    })
    @ApiResponse({ status: 200, description: 'Vehicle details' })
    getMyVehicle(@CurrentUser() rider: { id: string }) {
        return this.riderVehicleUpdateService.getMyVehicle(rider.id);
    }

    @Delete()
    @ApiOperation({
        summary: 'Delete latest vehicle',
        description:
            'Deletes your most recently registered vehicle. Also removes linked vehicle update requests.',
    })
    @ApiResponse({ status: 200, description: 'Vehicle deleted' })
    deleteLatest(@CurrentUser() rider: { id: string }) {
        return this.riderVehicleUpdateService.deleteVehicle(rider.id);
    }

    @Delete(':vehicleId')
    @ApiOperation({
        summary: 'Delete vehicle by id',
        description: 'Deletes the vehicle if it belongs to your account. Removes linked update requests.',
    })
    @ApiResponse({ status: 200, description: 'Vehicle deleted' })
    deleteOne(@CurrentUser() rider: { id: string }, @Param('vehicleId') vehicleId: string) {
        return this.riderVehicleUpdateService.deleteVehicle(rider.id, vehicleId);
    }

    @Post('update-request')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'licensePlateImage', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'licensePlateImage[]', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'documentImage', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'documentImage[]', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'vehicleImage', maxCount: MAX_IMAGES_PER_FIELD },
                { name: 'vehicleImage[]', maxCount: MAX_IMAGES_PER_FIELD },
            ],
            multerConfig,
        ),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                vehicleTypeId: { type: 'string' },
                brandName: { type: 'string' },
                vehicleName: { type: 'string' },
                vehicleColor: { type: 'string' },
                licensePlateNumber: { type: 'string' },
                licensePlateImage: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Optional; if omitted, existing license plate images are kept',
                },
                'licensePlateImage[]': { type: 'array', items: { type: 'string', format: 'binary' } },
                documentImage: { type: 'array', items: { type: 'string', format: 'binary' } },
                'documentImage[]': { type: 'array', items: { type: 'string', format: 'binary' } },
                vehicleImage: { type: 'array', items: { type: 'string', format: 'binary' } },
                'vehicleImage[]': { type: 'array', items: { type: 'string', format: 'binary' } },
            },
        },
    })
    @ApiOperation({
        summary: 'Submit vehicle details update for admin review',
        description:
            'Multipart: optional text fields and/or optional image groups. At least one change is required. If an image group is omitted, current images for that group are kept. Max 15 images per group, 3 MB each, JPG/JPEG/PNG.',
    })
    @ApiResponse({ status: 201, description: 'Request created' })
    async submitUpdateRequest(
        @Req() req: Request,
        @Body() dto: RiderVehicleUpdateDto,
        @UploadedFiles() files: Record<string, Express.Multer.File[] | undefined>,
    ) {
        const user = req.user as { id?: string };
        const userId = user?.id;
        if (!userId) {
            throw new BadRequestException('User context missing');
        }
        try {
            return await this.riderVehicleUpdateService.submitVehicleUpdateRequest(userId, dto, files ?? {});
        } catch (err: unknown) {
            if (err instanceof HttpException) throw err;
            const message = err instanceof Error ? err.message : 'Request failed';
            throw new BadRequestException(message);
        }
    }
}
