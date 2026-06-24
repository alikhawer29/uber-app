import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RevenueGraphPeriod } from 'src/common/constants/admin.constants';

export class AdminDashboardRevenueQueryDto {
    @ApiPropertyOptional({ enum: RevenueGraphPeriod, default: RevenueGraphPeriod.MONTHLY })
    @IsOptional()
    @IsEnum(RevenueGraphPeriod)
    period?: RevenueGraphPeriod = RevenueGraphPeriod.MONTHLY;
}
