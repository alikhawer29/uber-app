import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetCodeDto {
    @ApiProperty({ example: 'lewis@mailinator.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: '8692' })
    @IsString()
    @IsNotEmpty()
    @Length(4, 6)
    token: string;
}