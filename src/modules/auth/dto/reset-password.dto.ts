import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ example: 'lewis@mailinator.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: '8692' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ example: 'NewPassword123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
        message: 'Password too weak. It must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    })
    password: string;

    @ApiProperty({ example: 'NewPassword123!' })
    @IsString()
    @IsNotEmpty()
    passwordConfirmation: string;
}