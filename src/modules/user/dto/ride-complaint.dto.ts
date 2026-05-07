import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RideComplaintDto {
    @ApiProperty({ minLength: 10, maxLength: 1000 })
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(1000)
    message: string;
}

