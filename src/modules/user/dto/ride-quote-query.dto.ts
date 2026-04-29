import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class RideQuoteQueryDto {
    @ApiProperty({ description: 'Pickup latitude (WGS84)' })
    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    pickupLat: number;

    @ApiProperty({ description: 'Pickup longitude (WGS84)' })
    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    pickupLng: number;

    @ApiProperty({ description: 'Drop-off latitude (WGS84)' })
    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    dropLat: number;

    @ApiProperty({ description: 'Drop-off longitude (WGS84)' })
    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    dropLng: number;

    /** If provided, echoed as `estimatedTripStartLabel` for UI (Figma “Est: …”) */
    @ApiPropertyOptional({ example: '2025-10-14T12:51:00.000Z' })
    @IsOptional()
    @IsDateString()
    scheduledStart?: string;
}
