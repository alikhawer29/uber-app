import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Register a vehicle for an existing active rider (same fields as signup vehicle step). */
export class RiderAddVehicleDto {
    @ApiProperty({ description: 'Vehicle type id from GET /rider/vehicle-types' })
    @IsMongoId()
    vehicleTypeId: string;

    @ApiProperty({ example: 'Toyota' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    brandName: string;

    @ApiProperty({ example: 'Camry' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    vehicleName: string;

    @ApiProperty({ example: 'Silver' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    vehicleColor: string;

    @ApiProperty({ example: 'ABC-1234' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    licensePlateNumber: string;
}
