import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class EndRideDto {
    @ApiPropertyOptional({
        description: 'Required for cash rides: amount the passenger paid in cash (enter at end of trip).',
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    cashCollectedAmount?: number;
}
