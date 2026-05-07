import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MultipartFormFieldsInterceptor } from 'src/common/interceptors/multipart-form-fields.interceptor';
import { UserRole } from 'src/common/constants/user.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateContactUsDto } from 'src/modules/user/dto/create-contact-us.dto';
import { ContactUsService } from 'src/modules/user/services/contact-us.service';
import { ContactUsSenderRole } from 'src/shared/schemas/contact-us-submission.schema';

@ApiTags('Rider — Contact')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider')
export class RiderContactController {
    constructor(private readonly contactUsService: ContactUsService) {}

    @Post('contact-us')
    @UseInterceptors(MultipartFormFieldsInterceptor)
    @ApiConsumes('application/json', 'multipart/form-data')
    @ApiBody({ type: CreateContactUsDto })
    @ApiOperation({ summary: 'Submit contact us form (driver app)' })
    @ApiResponse({ status: 201, description: 'Message recorded' })
    async submitContactUs(@CurrentUser() user: any, @Body() dto: CreateContactUsDto) {
        return this.contactUsService.submit(user.id, ContactUsSenderRole.RIDER, dto);
    }
}
