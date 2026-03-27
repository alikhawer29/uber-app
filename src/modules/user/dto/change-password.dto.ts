import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({ example: 'OldPassword123!' })
    @IsString()
    @IsNotEmpty()
    oldPassword: string;

    @ApiProperty({ example: 'NewPassword123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
        message: 'Password too weak. It must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    })
    newPassword: string;

    @ApiProperty({ example: 'NewPassword123!' })
    @IsString()
    @IsNotEmpty()
    confirmNewPassword: string;
}