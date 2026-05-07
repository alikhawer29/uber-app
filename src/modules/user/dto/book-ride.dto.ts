import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsLatitude,
    IsLongitude,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { RidePaymentType } from 'src/common/constants/ride.constants';

export class BookRideDto {
    @ApiProperty()
    @IsMongoId()
    vehicleTypeId: string;

    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    pickupLatitude: number;

    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    pickupLongitude: number;

    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    dropOffLatitude: number;

    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    dropOffLongitude: number;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(255)
    pickupAddress: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(255)
    dropOffAddress: string;

    @ApiProperty({ enum: RidePaymentType, example: RidePaymentType.CASH })
    @IsEnum(RidePaymentType)
    paymentMethod: RidePaymentType;

    @ApiPropertyOptional({ description: 'Required if paymentMethod = card' })
    @IsOptional()
    @IsMongoId()
    cardId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(64)
    promoCode?: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    useWallet?: boolean;

    @ApiPropertyOptional({ maxLength: 300 })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    notes?: string;

    /** Omit date/time fields for Book Now; use ISO or pair below for Schedule Later */
    @IsOptional()
    @IsDateString()
    @ApiPropertyOptional({ example: '2026-05-07T14:30:00.000Z' })
    scheduledAt?: string;

    /** YYYY-MM-DD — must be sent with `scheduledAtTime` (unless `scheduledAt` is set) */
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
    @IsString()
    @ValidateIf((o) => !o.scheduledAt?.trim() && !!o.scheduledAtDate)
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledAtDate must be YYYY-MM-DD' })
    @ApiPropertyOptional({ example: '2026-05-07' })
    scheduledAtDate?: string;

    /** HH:mm or HH:mm:ss (24h) — must be sent with `scheduledAtDate` (unless `scheduledAt` is set) */
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

