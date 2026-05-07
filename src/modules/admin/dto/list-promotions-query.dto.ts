import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum AdminPromotionStatusFilterDto {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ALL = 'all',
}

export class ListPromotionsQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({ enum: AdminPromotionStatusFilterDto, default: AdminPromotionStatusFilterDto.ALL })
    @IsOptional()
    @IsEnum(AdminPromotionStatusFilterDto)
    status?: AdminPromotionStatusFilterDto = AdminPromotionStatusFilterDto.ALL;
}

