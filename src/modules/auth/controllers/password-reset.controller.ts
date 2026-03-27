import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
// import { Public } from '../../../../common/decorators/public.decorator';
import { PasswordResetService } from '../services/password-reset.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyResetCodeDto } from '../dto/verify-reset-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Auth - Password Reset')
@Controller('auth/password')
export class PasswordResetController {
    constructor(private readonly passwordResetService: PasswordResetService) { }

    @Public()
    @Post('forgot')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Initiate password reset' })
    @ApiResponse({ status: 200, description: 'Reset code sent successfully' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.passwordResetService.initiatePasswordReset(forgotPasswordDto);
    }

    @Public()
    @Post('verify-code')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify reset code' })
    @ApiResponse({ status: 200, description: 'Reset code verified successfully' })
    async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
        return this.passwordResetService.verifyResetCode(verifyResetCodeDto);
    }

    @Public()
    @Post('reset')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with code' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.passwordResetService.resetPassword(resetPasswordDto);
    }

    @Public()
    @Post('resend-code')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend reset code' })
    @ApiResponse({ status: 200, description: 'Reset code resent successfully' })
    async resendResetCode(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.passwordResetService.resendResetCode(forgotPasswordDto.email);
    }
}