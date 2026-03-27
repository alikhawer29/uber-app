import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { SharedModule } from '../shared/shared.module';
import { NotificationModule } from '../notification/notification.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordResetController } from './controllers/password-reset.controller';
import { SharedModule } from 'src/shared/shared.module';

@Module({
    imports: [
        SharedModule,
        ConfigModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('jwt.secret'),
                signOptions: { expiresIn: configService.get('jwt.expiresIn') },
            }),
            inject: [ConfigService],
        }),
        NotificationModule
    ],
    providers: [
        JwtStrategy,
        PasswordResetService
    ],
    controllers: [
        PasswordResetController
    ],
    exports: [JwtModule],
})
export class AuthModule { }