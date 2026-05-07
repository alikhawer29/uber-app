import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class RiderAvailabilityDto {
    @ApiProperty({ description: 'true = online and eligible for ride offers; false = offline' })
    @IsBoolean()
    isOnline: boolean;
}
