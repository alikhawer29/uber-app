import { Controller, Get, Put, Post, Body, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { MultipartFormFieldsInterceptor } from 'src/common/interceptors/multipart-form-fields.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { ContactUsService } from '../services/contact-us.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CreateContactUsDto } from '../dto/create-contact-us.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { ContactUsSenderRole } from 'src/shared/schemas/contact-us-submission.schema';
import { multerConfig } from 'src/config/multer.config';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly contactUsService: ContactUsService,
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

    @Post('contact-us')
    @Roles(UserRole.USER)
    @UseInterceptors(MultipartFormFieldsInterceptor)
    @ApiConsumes('application/json', 'multipart/form-data')
    @ApiBody({ type: CreateContactUsDto })
    @ApiOperation({
        summary: 'Submit contact us form (passenger app)',
        description:
            'Accepts JSON (`application/json`) or form-data (`multipart/form-data`). Plain form-data requires multipart parsing so fields populate correctly.',
    })
    @ApiResponse({ status: 201, description: 'Message recorded' })
    async submitContactUs(@CurrentUser() user: any, @Body() dto: CreateContactUsDto) {
        return this.contactUsService.submit(user.id, ContactUsSenderRole.USER, dto);
    }

}