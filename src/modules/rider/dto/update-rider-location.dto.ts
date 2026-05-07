import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateRiderLocationDto {
    @Type(() => Number)
    @IsNumber()
    @IsLatitude()
    @ApiProperty()
    latitude: number;

    @Type(() => Number)
    @IsNumber()
    @IsLongitude()
    @ApiProperty()
    longitude: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(360)
    @ApiPropertyOptional()
    heading?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @ApiPropertyOptional()
    speed?: number;

    @IsBoolean()
    @ApiProperty()
    isOnline: boolean;
}

