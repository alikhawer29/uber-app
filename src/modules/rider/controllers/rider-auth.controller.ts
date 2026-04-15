import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Post,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { multerConfig } from 'src/config/multer.config';
import { RiderAuthService } from '../services/rider-auth.service';
import { RiderRegisterDto } from '../dto/rider-register.dto';
import { LoginDto } from 'src/modules/user/dto/login.dto';
import { VehicleTypeRepository } from 'src/shared/repositories/vehicle-type.repository';

const MAX_IMAGES_PER_FIELD = 15;

@ApiTags('Rider — Authentication')
@Controller('rider')
export class RiderAuthController {
    constructor(
        private readonly riderAuthService: RiderAuthService,
        private readonly vehicleTypeRepository: VehicleTypeRepository,
    ) {}

    @Public()
    @Post('auth/login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Rider login',
        description: 'Same payload as user login. Only accounts with role **rider** and status **active** (after admin approval) can sign in.',
    })
    @ApiResponse({ status: 200, description: 'Rider logged in; returns user, accessToken, refreshToken' })
    async login(@Body() loginDto: LoginDto) {
        return this.riderAuthService.login(loginDto);
    }

    @Post('auth/logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @Roles(UserRole.RIDER)
    @ApiOperation({ summary: 'Rider logout (invalidates access + refresh tokens)' })
    @ApiResponse({ status: 200, description: 'Logged out' })
    async logout(@CurrentUser() user: { id: string }) {
        return this.riderAuthService.logout(user.id);
    }

    @Public()
    @Post('auth/refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh rider tokens (refresh token must belong to a rider session)' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    async refreshTokens(@Body() body: { refreshToken?: string }) {
        const { refreshToken } = body ?? {};
        if (!refreshToken) {
            throw new BadRequestException('Refresh token is required');
        }
        const tokens = await this.riderAuthService.refreshTokens(refreshToken);
        return {
            success: true,
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }

    @Public()
    @Get('vehicle-types')
    @ApiOperation({ summary: 'List active vehicle types (for rider signup step 2)' })
    async listVehicleTypesForSignup() {
        const { data } = await this.vehicleTypeRepository.paginateActive(1, 100);
        return data.map((d: any) => ({
            id: d._id?.toString?.() ?? String(d._id),
            name: d.name,
            facilities: d.facilities,
            image: d.image,
            sortOrder: d.sortOrder,
        }));
    }

    @Public()
    @Post('auth/register')
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
            required: [
                'firstName',
                'lastName',
                'phone',
                'email',
                'password',
                'confirmPassword',
                'vehicleTypeId',
                'brandName',
                'vehicleName',
                'vehicleColor',
                'licensePlateNumber',
            ],
            properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
                password: { type: 'string' },
                confirmPassword: { type: 'string' },
                vehicleTypeId: { type: 'string' },
                brandName: { type: 'string' },
                vehicleName: { type: 'string' },
                vehicleColor: { type: 'string' },
                licensePlateNumber: { type: 'string' },
                licensePlateImage: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Repeat field or use licensePlateImage[] for multiple JPG/JPEG/PNG files (max 15, 3 MB each)',
                },
                'licensePlateImage[]': {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
                documentImage: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
                'documentImage[]': {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
                vehicleImage: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
                'vehicleImage[]': {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    @ApiOperation({
        summary: 'Rider signup (steps 1–3)',
        description:
            'Multipart: text fields plus multiple images per group (JPG, JPEG, or PNG). Use repeated `licensePlateImage` parts and/or `licensePlateImage[]` (same for documentImage / vehicleImage). At least one file per group required; max 15 per group; 3 MB each.',
    })
    @ApiResponse({ status: 201, description: 'Application submitted' })
    async register(
        @Body() dto: RiderRegisterDto,
        @UploadedFiles()
        files: Record<string, Express.Multer.File[] | undefined>,
    ) {
        try {
            return await this.riderAuthService.register(dto, files ?? {});
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }
            const message = err instanceof Error ? err.message : 'Registration failed';
            throw new BadRequestException(message);
        }
    }
}
