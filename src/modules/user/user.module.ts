import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';
import { UserService } from './services/user.service';
import { UserAuthService } from './services/user-auth.service';
import { UserAuthController } from './controllers/user-auth.controller';
import { UserController } from './controllers/user.controller';
import { SharedModule } from 'src/shared/shared.module';
import { multerConfig } from 'src/config/multer.config';
import { MulterModule } from '@nestjs/platform-express';
import { CommonModule } from 'src/common/common.module';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        ConfigModule,
        JwtModule,
        NotificationModule,
        MulterModule.register(multerConfig),
    ],
    providers: [
        UserService,
        UserAuthService,
    ],
    controllers: [
        UserAuthController,
        UserController
    ],
    exports: [],
})
export class UserModule { }