import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVehicleTypeDto {
    @ApiProperty({ example: 'Mini' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name: string;

    @ApiProperty({ example: 'Seating Capacity: 2, Non-AC' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    facilities: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    sortOrder?: number;
}
