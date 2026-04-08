import { Body, Controller, HttpCode, HttpStatus, Post, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { LoginDto } from 'src/modules/user/dto/login.dto';
import { AdminAuthService } from '../services/admin-auth.service';

@ApiTags('Admin — Authentication')
@Controller('admin/auth')
export class AdminAuthController {
    constructor(private readonly adminAuthService: AdminAuthService) {}

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Admin login (role admin only)' })
    @ApiResponse({ status: 200, description: 'Admin logged in' })
    async login(@Body() loginDto: LoginDto) {
        return this.adminAuthService.login(loginDto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Admin logout (invalidates access + refresh)' })
    @ApiResponse({ status: 200, description: 'Logged out' })
    async logout(@CurrentUser() user: { id: string }) {
        return this.adminAuthService.logout(user.id);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh admin tokens' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshTokens(@Body() body: { refreshToken: string }) {
        const { refreshToken } = body;
        if (!refreshToken) {
            throw new BadRequestException('Refresh token is required');
        }
        const tokens = await this.adminAuthService.refreshTokens(refreshToken);
        return {
            success: true,
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }
}
