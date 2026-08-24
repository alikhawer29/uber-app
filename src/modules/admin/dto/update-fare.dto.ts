import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateFareDto {
    /** Allowed so admin form multipart can send it; not used to reassign the fare. */
    @ApiPropertyOptional()
    @IsOptional()
    @IsMongoId()
    vehicleTypeId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    baseFare?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    costPerKm?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    waitingFeePerMin?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minimumFare?: number;
}
