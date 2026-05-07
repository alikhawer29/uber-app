import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsLatitude,
    IsLongitude,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { SavedPlaceType } from 'src/shared/schemas/saved-place.schema';

export class UpdateSavedPlaceDto {
    @ApiPropertyOptional({ enum: SavedPlaceType })
    @IsOptional()
    @IsEnum(SavedPlaceType)
    type?: SavedPlaceType;

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
