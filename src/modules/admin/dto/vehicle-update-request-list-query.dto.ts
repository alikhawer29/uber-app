import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AdminListQueryDto } from './list-query.dto';

export class VehicleUpdateRequestListQueryDto extends AdminListQueryDto {
    @ApiPropertyOptional({
        enum: ['all', 'pending', 'approved', 'rejected'],
        default: 'all',
    })
    @IsOptional()
    @IsIn(['all', 'pending', 'approved', 'rejected'])
    status?: 'all' | 'pending' | 'approved' | 'rejected';
}
