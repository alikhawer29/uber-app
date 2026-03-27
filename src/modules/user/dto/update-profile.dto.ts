import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiProperty({ example: 'john@example.com', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 'John', required: false })
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiProperty({ example: 'Doe', required: false })
    @IsString()
    @IsOptional()
    lastName?: string;

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