import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum CancelReason {
    DRIVER_ASKED_TO_CANCEL = 'driver_asked_to_cancel',
    WAIT_TIME_TOO_LONG = 'wait_time_too_long',
    COULD_NOT_FIND_DRIVER = 'could_not_find_driver',
    DRIVER_ARRIVED_EARLY = 'driver_arrived_early',
    DRIVER_NOT_GETTING_CLOSER = 'driver_not_getting_closer',
    OTHER = 'other',
}

export class CancelRideDto {
    @ApiProperty({ enum: CancelReason })
    @IsEnum(CancelReason)
    reason: CancelReason;

    @ApiPropertyOptional({ maxLength: 300, description: 'Required when reason = other' })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    reasonNote?: string;
}

