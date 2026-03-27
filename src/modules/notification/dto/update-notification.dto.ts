import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationStatus } from 'src/shared/schemas/notification.schema';
// import { NotificationStatus } from '../../../../shared/schemas/notification.schema';

export class UpdateNotificationDto {
    @ApiProperty({ enum: NotificationStatus, required: false })
    @IsEnum(NotificationStatus)
    @IsOptional()
    status?: NotificationStatus;
}