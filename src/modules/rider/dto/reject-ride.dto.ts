import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectRideDto {
    @ApiProperty({ minLength: 5, maxLength: 200, example: 'Too far from pickup' })
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(200)
    reason: string;
}

