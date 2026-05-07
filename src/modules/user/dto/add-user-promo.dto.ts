import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddUserPromoDto {
    @ApiProperty({ example: 'SAVE20' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    promoCode: string;
}

