import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

const trimOrUndef = ({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t.length ? t : undefined;
};

export class RiderVehicleUpdateDto {
    @ApiPropertyOptional({ description: 'Vehicle type id from GET /rider/vehicle-types' })
    @IsOptional()
    @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
    @IsMongoId()
    vehicleTypeId?: string;

    @ApiPropertyOptional({ example: 'Toyota' })
    @IsOptional()
    @Transform(trimOrUndef)
    @IsString()
    @MaxLength(120)
    brandName?: string;

    @ApiPropertyOptional({ example: 'Camry' })
    @IsOptional()
    @Transform(trimOrUndef)
    @IsString()
    @MaxLength(120)
    vehicleName?: string;

    @ApiPropertyOptional({ example: 'Silver' })
    @IsOptional()
    @Transform(trimOrUndef)
    @IsString()
    @MaxLength(80)
    vehicleColor?: string;

    @ApiPropertyOptional({ example: 'ABC-1234' })
    @IsOptional()
    @Transform(trimOrUndef)
    @IsString()
    @MaxLength(32)
    licensePlateNumber?: string;
}
