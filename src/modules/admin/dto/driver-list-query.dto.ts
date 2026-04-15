import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AdminListQueryDto } from './list-query.dto';

export class DriverListQueryDto extends AdminListQueryDto {
    @ApiPropertyOptional({
        enum: ['all', 'active', 'inactive'],
        default: 'all',
        description: 'Filter by driver status (approved drivers only: active / inactive)',
    })
    @IsOptional()
    @IsIn(['all', 'active', 'inactive'])
    status?: 'all' | 'active' | 'inactive';
}
