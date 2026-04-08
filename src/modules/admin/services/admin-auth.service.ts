import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserAuthService } from 'src/modules/user/services/user-auth.service';
import { LoginDto } from 'src/modules/user/dto/login.dto';
import { UserRole } from 'src/common/constants/user.constants';
import { UserStatus } from 'src/common/constants/user.constants';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userAuthService: UserAuthService,
    ) {}

    async login(loginDto: LoginDto) {
        const { email, password, fcmToken } = loginDto;
        const user = await this.userRepository.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (String(user.role) !== UserRole.ADMIN && String(user.role) !== 'admin') {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is not active');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (fcmToken && fcmToken.trim() !== '') {
            await this.userRepository.addFcmToken(user._id.toString(), fcmToken.trim());
        }
        const tokens = await this.userAuthService.establishSession(
            user._id.toString(),
            user.email,
            user.role,
        );
        const updatedUser = await this.userRepository.findByEmailWithAvatar(email);
        return {
            user: sanitizeUserUtils.sanitizeUser(updatedUser),
            ...tokens,
        };
    }

    async logout(userId: string) {
        return this.userAuthService.logout(userId);
    }

    async refreshTokens(refreshToken: string) {
        const payload = await this.userAuthService.verifyRefreshToken(refreshToken);
        if (!payload) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.userRepository.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
        if (String(user.role) !== UserRole.ADMIN && String(user.role) !== 'admin') {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
        return this.userAuthService.refreshTokens(payload.sub, refreshToken);
    }
}
