import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsDateString,
    IsLatitude,
    IsLongitude,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
    ValidateIf,
} from 'class-validator';

export class EstimateRideDto {
    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    @ApiProperty({ example: 37.7749 })
    pickupLatitude: number;

    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    @ApiProperty({ example: -122.4194 })
    pickupLongitude: number;

    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    @ApiProperty({ example: 37.7849 })
    dropOffLatitude: number;

    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    @ApiProperty({ example: -122.4094 })
    dropOffLongitude: number;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(255)
    @ApiProperty({ example: 'West Street California' })
    pickupAddress: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(255)
    @ApiProperty({ example: '23 St West Street California' })
    dropOffAddress: string;

    @IsOptional()
    @IsDateString()
    @ApiPropertyOptional({ example: '2026-05-07T10:15:00.000Z' })
    scheduledAt?: string;

    /** YYYY-MM-DD (use with `scheduledAtTime`; alternative to `scheduledAt`) */
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
    @IsString()
    @ValidateIf((o) => !o.scheduledAt?.trim() && !!o.scheduledAtDate)
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledAtDate must be YYYY-MM-DD' })
    @ApiPropertyOptional({ example: '2026-05-07' })
    scheduledAtDate?: string;

    /** HH:mm or HH:mm:ss (24h; use with `scheduledAtDate`) */
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
    @IsString()
    @ValidateIf((o) => !o.scheduledAt?.trim() && !!o.scheduledAtTime)
    @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
        message: 'scheduledAtTime must be HH:mm or HH:mm:ss (24h)',
    })
    @ApiPropertyOptional({ example: '14:30' })
    scheduledAtTime?: string;
}

