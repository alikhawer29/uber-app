import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum AdminPromotionStatusDto {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export class CreatePromotionDto {
    @ApiProperty({ example: 'Summer Promo' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @ApiProperty({ example: 'SAVE20' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    code: string;

    @ApiProperty({
        example: '20%',
        description: 'Either a percent like "20%" or a fixed amount like "10".',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    discount: string;

    @ApiPropertyOptional({ example: 100, description: 'Maximum total uses for this promo' })
    @IsOptional()
    @IsInt()
    @Min(0)
    usageLimit?: number;

    @ApiPropertyOptional({ example: '2026-05-07T00:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    validFrom?: string;

    @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
    @IsOptional()
    @IsDateString()
    validUntil?: string;

    @ApiPropertyOptional({ enum: AdminPromotionStatusDto, default: AdminPromotionStatusDto.ACTIVE })
    @IsOptional()
    @IsEnum(AdminPromotionStatusDto)
    status?: AdminPromotionStatusDto;
}

