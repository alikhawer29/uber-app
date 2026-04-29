import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
    MaxLength,
} from 'class-validator';
import { RidePaymentType } from 'src/common/constants/ride.constants';

export class CreateRideDto {
    @ApiProperty({ example: '123 Main St', description: 'Pickup formatted address' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    pickupAddress: string;

    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    pickupLat: number;

    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    pickupLng: number;

    @ApiProperty({ example: '456 Oak Ave' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    dropAddress: string;

    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    dropLat: number;

    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    dropLng: number;

    @ApiProperty({
        description:
            'Ride start: “now” for immediate bookings, or chosen datetime for scheduled trips (see `isScheduled`).',
        example: '2025-10-14T12:51:00.000Z',
    })
    @IsDateString()
    startTime: string;

    @ApiProperty({
        description:
            'Matches Figma “Schedule a Trip”: true when user picked a future date/time; false for ride now.',
    })
    @IsBoolean()
    isScheduled: boolean;

    @ApiProperty({ description: 'Vehicle type id from GET /user/rides/quote' })
    @IsMongoId()
    vehicleTypeId: string;

    @ApiProperty({ enum: RidePaymentType })
    @IsEnum(RidePaymentType)
    paymentType: RidePaymentType;

    @ApiPropertyOptional({ description: 'Promo code from payment screen' })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    promoCode?: string;
}
