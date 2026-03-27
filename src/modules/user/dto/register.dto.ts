import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
        message:
            'Password too weak. It must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    })
    password: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    confirmPassword: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ example: '123 Main St', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
    @IsOptional()
    avatar?: any;
}
