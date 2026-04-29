import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ValidatePromoDto {
    @ApiProperty({ example: 'SAVE10', description: 'Promo code from payment screen' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    code: string;

    @ApiPropertyOptional({
        description: 'Fare subtotal before discount (same basis as quote `totalAmount`)',
        example: 40,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    subtotal?: number;
}
