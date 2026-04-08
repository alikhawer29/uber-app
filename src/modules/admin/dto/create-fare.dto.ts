import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNumber, Min } from 'class-validator';

export class CreateFareDto {
    @ApiProperty({ description: 'Vehicle type document id' })
    @IsMongoId()
    vehicleTypeId: string;

    @ApiProperty({ example: 15 })
    @IsNumber()
    @Min(0)
    baseFare: number;

    @ApiProperty({ example: 10, description: 'Cost per km (Payment Per Km in UI)' })
    @IsNumber()
    @Min(0)
    costPerKm: number;

    @ApiProperty({ example: 5 })
    @IsNumber()
    @Min(0)
    waitingFeePerMin: number;

    @ApiProperty({ example: 20 })
    @IsNumber()
    @Min(0)
    minimumFare: number;
}
