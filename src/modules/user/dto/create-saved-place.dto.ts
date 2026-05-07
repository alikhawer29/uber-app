import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsLatitude,
    IsLongitude,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { SavedPlaceType } from 'src/shared/schemas/saved-place.schema';

export class CreateSavedPlaceDto {
    @ApiProperty({
        enum: SavedPlaceType,
        example: SavedPlaceType.HOME,
        description: 'Place category: home, work, or a generic saved pin',
    })
    @IsEnum(SavedPlaceType)
    type: SavedPlaceType;

    @ApiProperty({ example: 'Home', description: 'Label shown in Saved Places (Figma: Name)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiProperty({
        example: '27 Sawayn Square, City',
        description: 'Formatted address from Google Places (Figma: Location)',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    formattedAddress: string;

    @ApiPropertyOptional({
        example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        description: 'Google Place ID from Places API / mobile SDK',
    })
    @IsOptional()
    @IsString()
    @MaxLength(256)
    googlePlaceId?: string;

    @ApiProperty({ example: -33.8688, description: 'WGS84 latitude from Google' })
    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    latitude: number;

    @ApiProperty({ example: 151.2093, description: 'WGS84 longitude from Google' })
    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    longitude: number;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    sortOrder?: number;
}
