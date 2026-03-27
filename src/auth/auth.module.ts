import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SharedModule } from '../shared/shared.module';
import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';

@Module({
    imports: [
        SharedModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('jwt.secret'),
                signOptions: { expiresIn: configService.get('jwt.expiresIn') },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [JwtStrategy],
    exports: [JwtModule],
})
export class AuthModule { }