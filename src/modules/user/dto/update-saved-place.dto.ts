import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSavedPlaceDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    formattedAddress?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(256)
    googlePlaceId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    latitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    longitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    sortOrder?: number;
}
