import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApprovalRejectDto {
    @ApiPropertyOptional({ example: 'Documents are unreadable.' })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    reason?: string;
}
