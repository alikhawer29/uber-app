import { Controller, Get, Put, Body, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { multerConfig } from 'src/config/multer.config';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
    ) { }

    @Get('profile')
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    async getProfile(@CurrentUser() user: any) {
        return this.userService.getProfile(user.id);
    }

    @Put('profile')
    @UseInterceptors(FileInterceptor('avatar', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateProfileDto })
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'User profile updated successfully' })
    async updateProfile(
        @CurrentUser() user: any,
        @Body() updateProfileDto: UpdateProfileDto,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false, // optional file
                validators: [
                    new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
                ],
            }),
        )
        avatar?: Express.Multer.File,
    ) {
        return this.userService.updateProfile(user.id, updateProfileDto, avatar);
    }

    @Put('change-password')
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    async changePassword(@CurrentUser() user: any, @Body() changePasswordDto: ChangePasswordDto) {
        return this.userService.changePassword(user.id, changePasswordDto);
    }

}