import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { AdminPromotionStatusDto } from './create-promotion.dto';

export class UpdatePromotionDto {
    @ApiPropertyOptional({ example: 'Summer Promo Updated' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiPropertyOptional({ example: 'SAVE20' })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    code?: string;

    @ApiPropertyOptional({ example: '15%', description: 'Either a percent like "15%" or a fixed amount like "10".' })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    discount?: string;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsInt()
    @Min(0)
    usageLimit?: number | null;

    @ApiPropertyOptional({ example: '2026-05-07T00:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    validFrom?: string | null;

    @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
    @IsOptional()
    @IsDateString()
    validUntil?: string | null;

    @ApiPropertyOptional({ enum: AdminPromotionStatusDto })
    @IsOptional()
    @IsEnum(AdminPromotionStatusDto)
    status?: AdminPromotionStatusDto;
}

