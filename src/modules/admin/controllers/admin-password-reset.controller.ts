import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { PasswordResetService } from 'src/modules/auth/services/password-reset.service';
import { ForgotPasswordDto } from 'src/modules/auth/dto/forgot-password.dto';
import { VerifyResetCodeDto } from 'src/modules/auth/dto/verify-reset-code.dto';
import { ResetPasswordDto } from 'src/modules/auth/dto/reset-password.dto';

const ADMIN_AUDIENCE = { allowedRoles: [UserRole.ADMIN] };

@ApiTags('Admin — Password reset')
@Controller('admin/auth/password')
export class AdminPasswordResetController {
    constructor(private readonly passwordResetService: PasswordResetService) {}

    @Public()
    @Post('forgot')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request reset code (admin accounts only)' })
    @ApiResponse({ status: 200, description: 'If the email is an admin, a code is sent' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.passwordResetService.initiatePasswordReset(forgotPasswordDto, ADMIN_AUDIENCE);
    }

    @Public()
    @Post('verify-code')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify admin reset code' })
    async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
        return this.passwordResetService.verifyResetCode(verifyResetCodeDto, ADMIN_AUDIENCE);
    }

    @Public()
    @Post('reset')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset admin password with code' })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.passwordResetService.resetPassword(resetPasswordDto, ADMIN_AUDIENCE);
    }

    @Public()
    @Post('resend-code')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend admin reset code' })
    async resendResetCode(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.passwordResetService.resendResetCode(forgotPasswordDto.email, ADMIN_AUDIENCE);
    }
}
