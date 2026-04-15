import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AdminListQueryDto } from './list-query.dto';

export class DriverRegistrationListQueryDto extends AdminListQueryDto {
    @ApiPropertyOptional({
        enum: ['all', 'pending', 'rejected', 'approved'],
        default: 'all',
        description:
            'pending = awaiting review, rejected = application rejected, approved = registration accepted (active or inactive driver)',
    })
    @IsOptional()
    @IsIn(['all', 'pending', 'rejected', 'approved'])
    status?: 'all' | 'pending' | 'rejected' | 'approved';
}
