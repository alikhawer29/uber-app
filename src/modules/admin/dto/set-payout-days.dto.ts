import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SetPayoutDaysDto {
    @ApiProperty({ example: 5, description: 'Number of days before driver payout' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(365)
    payoutDays: number;
}
