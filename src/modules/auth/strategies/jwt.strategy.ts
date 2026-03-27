import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserStatus } from 'src/common/constants/user.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {
        const jwtSecret = configService.get<string>('jwt.secret');
        if (!jwtSecret) {
            throw new Error('JWT secret is not defined');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        const user = await this.userRepository.findByIdForAuth(payload.sub);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is not active');
        }

        const tokenIssuedAtMs =
            typeof payload?.tokenIssuedAt === 'number'
                ? payload.tokenIssuedAt
                : typeof payload?.iat === 'number'
                    ? payload.iat * 1000
                    : 0;

        if (
            user.tokenInvalidBefore &&
            tokenIssuedAtMs > 0 &&
            tokenIssuedAtMs <= user.tokenInvalidBefore.getTime()
        ) {
            throw new UnauthorizedException('Token has been invalidated. Please login again.');
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}