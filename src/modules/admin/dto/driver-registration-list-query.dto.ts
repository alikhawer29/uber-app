import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AdminListQueryDto } from './list-query.dto';

export class DriverRegistrationListQueryDto extends AdminListQueryDto {
    @ApiPropertyOptional({
        enum: ['all', 'pending', 'rejected'],
        default: 'all',
        description:
            'all = pending + rejected (default). pending = awaiting review. rejected = application declined. Approved drivers are not in this queue.',
    })
    @IsOptional()
    @IsIn(['all', 'pending', 'rejected'])
    status?: 'all' | 'pending' | 'rejected';
}
