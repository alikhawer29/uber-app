import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { File, FileSchema } from './schemas/file.schema';
import { UserRepository } from './repositories/user.repository';
import { FileRepository } from './repositories/file.repository';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationRepository } from './repositories/notification.repository';
import { PasswordReset, PasswordResetSchema } from './schemas/password-reset.schema';
import { PasswordResetRepository } from './repositories/password-reset.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: File.name, schema: FileSchema },
            { name: Notification.name, schema: NotificationSchema },
            { name: PasswordReset.name, schema: PasswordResetSchema },
        ]),
    ],
    providers: [UserRepository, FileRepository, NotificationRepository, PasswordResetRepository],
    exports: [MongooseModule, UserRepository, FileRepository, NotificationRepository, PasswordResetRepository],
})
export class SharedModule { }