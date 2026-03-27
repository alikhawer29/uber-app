import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UserStatus } from '../../../common/constants/user.constants';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { FileType, FileCategory } from '../../../common/constants/file.constants';
import { Types } from "mongoose";
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';

@Injectable()
export class UserAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly fileRepository: FileRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly notificationService: NotificationService,
    ) { }

    async register(registerDto: RegisterDto, avatar?: Express.Multer.File) {
        const { email, password, confirmPassword, firstName, lastName, phone, address } = registerDto;

        if (password !== confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user first
        const user = await this.userRepository.create({
            email: email.toLowerCase(),
            firstName,
            lastName,
            password: hashedPassword,
            phone,
            address,
        });

        // ✔ Save avatar if uploaded
        if (avatar) {
            const savedFile = await this.fileRepository.create({
                name: avatar.filename,
                originalName: avatar.originalname,
                path: avatar.filename,
                mimeType: avatar.mimetype,
                size: avatar.size,
                type: FileType.IMAGE,
                category: FileCategory.AVATAR,
                fileableId: new Types.ObjectId(user._id),
                fileableType: 'User',
                uploadedBy: new Types.ObjectId(user._id),
            });

            // update user avatar path
            await this.userRepository.update(user._id.toString(), { avatar: savedFile.path });
        }

        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

        await this.notificationService.notifyNewUserRegistration({
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        });
        const updatedUser = await this.userRepository.findByEmailWithAvatar(email);

        return {
            user: sanitizeUserUtils.sanitizeUser(updatedUser),
            ...tokens,
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password, fcmToken } = loginDto;

        // Find user with password
        const user = await this.userRepository.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is not active');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Save FCM token if provided
        if (fcmToken && fcmToken.trim() !== '') {
            await this.userRepository.addFcmToken(user._id.toString(), fcmToken.trim());
        }

        // Generate tokens
        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);
        const updatedUser = await this.userRepository.findByEmailWithAvatar(email);

        return {
            user: sanitizeUserUtils.sanitizeUser(updatedUser),
            ...tokens,
        };
    }

    async logout(userId: string) {
        // Update refresh token to null
        await this.userRepository.updateRefreshToken(userId, null);

        // Remove all FCM tokens automatically on logout
        // This ensures no push notifications are sent to any of the user's devices after logout
        await this.userRepository.clearAllFcmTokens(userId);

        return { message: 'Logout successful' };
    }

    async verifyRefreshToken(refreshToken: string): Promise<any> {
        try {
            // Verify refresh token using refreshSecret
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get('jwt.refreshSecret'),
            });
            return payload;
        } catch (error) {
            return null;
        }
    }

    async refreshTokens(userId: string, refreshToken: string) {
        // Need refreshToken field, which is select:false by default
        const user = await this.userRepository.findByIdWithRefreshToken(userId);
        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Verify refresh token matches the one stored in database
        if (user.refreshToken !== refreshToken) {
            throw new UnauthorizedException('Refresh token mismatch');
        }

        // Generate new tokens
        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

        return tokens;
    }

    private async generateTokens(userId: string, email: string, role: string) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email, role },
                { secret: this.configService.get('jwt.secret'), expiresIn: this.configService.get('jwt.expiresIn') },
            ),
            this.jwtService.signAsync(
                { sub: userId, email, role },
                { secret: this.configService.get('jwt.refreshSecret'), expiresIn: this.configService.get('jwt.refreshExpiresIn') },
            ),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }
}