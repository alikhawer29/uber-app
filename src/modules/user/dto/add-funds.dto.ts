import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, Max, Min } from 'class-validator';

export class AddFundsDto {
    @ApiProperty({ example: 100, minimum: 1, maximum: 10000 })
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(10000)
    amount: number;

    @ApiProperty()
    @IsMongoId()
    cardId: string;
}

