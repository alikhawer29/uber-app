import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelRideRiderDto {
    @ApiProperty({ minLength: 5, maxLength: 300 })
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(300)
    reason: string;
}

