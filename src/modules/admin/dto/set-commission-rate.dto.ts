import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class SetCommissionRateDto {
    @ApiProperty({ example: 18, description: 'Commission percentage (0–100)' })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(100)
    percentage: number;
}
