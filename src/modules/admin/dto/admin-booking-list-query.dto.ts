import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AdminBookingStatusFilter } from 'src/common/constants/admin.constants';

export class AdminBookingListQueryDto {
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

    @ApiPropertyOptional({ description: 'Search trip id, user name, driver name, or address' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    search?: string;

    @ApiPropertyOptional({ enum: AdminBookingStatusFilter })
    @IsOptional()
    @IsEnum(AdminBookingStatusFilter)
    status?: AdminBookingStatusFilter;

    @ApiPropertyOptional({ description: 'Filter rides from this date (ISO)' })
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Filter rides until this date (ISO)' })
    @IsOptional()
    @IsDateString()
    toDate?: string;
}
