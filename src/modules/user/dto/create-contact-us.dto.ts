import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactUsDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(100)
    lastName: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    @MaxLength(254)
    email: string;

    @ApiProperty({ example: 'I need help with…' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(5000)
    message: string;
}
