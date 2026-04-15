import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AdminListQueryDto } from './list-query.dto';

export class AdminUserListQueryDto extends AdminListQueryDto {
    @ApiPropertyOptional({
        enum: ['all', 'active', 'inactive', 'suspended'],
        default: 'all',
        description: 'Filter by account status (app users / passengers only)',
    })
    @IsOptional()
    @IsIn(['all', 'active', 'inactive', 'suspended'])
    status?: 'all' | 'active' | 'inactive' | 'suspended';
}
