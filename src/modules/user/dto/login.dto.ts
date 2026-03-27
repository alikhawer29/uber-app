import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiPropertyOptional({ 
        example: 'fcm-device-token-here',
        description: 'Firebase Cloud Messaging device token for push notifications'
    })
    @IsString()
    @IsOptional()
    fcmToken?: string;
}