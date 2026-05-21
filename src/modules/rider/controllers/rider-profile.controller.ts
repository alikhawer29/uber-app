import {
    Body,
    Controller,
    Get,
    Put,
    UploadedFile,
    UseInterceptors,
    ParseFilePipe,
    MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { multerConfig } from 'src/config/multer.config';
import { UpdateProfileDto } from 'src/modules/user/dto/update-profile.dto';
import { RiderProfileService } from '../services/rider-profile.service';

@ApiTags('Rider — Profile')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider/profile')
export class RiderProfileController {
    constructor(private readonly riderProfileService: RiderProfileService) {}

    @Get()
    @ApiOperation({ summary: 'Get rider profile with ratings' })
    @ApiResponse({ status: 200, description: 'Rider profile retrieved successfully' })
    getProfile(@CurrentUser() rider: { id: string }) {
        return this.riderProfileService.getProfile(rider.id);
    }

    @Put()
    @UseInterceptors(FileInterceptor('avatar', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateProfileDto })
    @ApiOperation({ summary: 'Update rider profile' })
    @ApiResponse({ status: 200, description: 'Rider profile updated successfully' })
    updateProfile(
        @CurrentUser() rider: { id: string },
        @Body() dto: UpdateProfileDto,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
            }),
        )
        avatar?: Express.Multer.File,
    ) {
        return this.riderProfileService.updateProfile(rider.id, dto, avatar);
    }
}
