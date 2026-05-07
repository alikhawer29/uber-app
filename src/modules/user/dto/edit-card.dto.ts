import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class EditCardDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    cardHolderName?: string;

    @ApiPropertyOptional({ example: '12' })
    @IsOptional()
    @IsString()
    @Matches(/^(0[1-9]|1[0-2])$/, { message: 'expireMonth must be 01-12' })
    expireMonth?: string;

    @ApiPropertyOptional({ example: '25' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{2}$/, { message: 'expireYear must be 2 digits (YY)' })
    expireYear?: string;

    @ApiPropertyOptional({ example: '123' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{3}$/, { message: 'cvv must be exactly 3 digits' })
    cvv?: string;
}

