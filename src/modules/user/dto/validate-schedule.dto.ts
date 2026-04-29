import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class ValidateScheduleDto {
    @ApiProperty({ example: '2025-10-14T12:51:00.000Z', description: 'Combined date/time for the scheduled ride' })
    @IsDateString()
    startTime: string;

    @ApiProperty({
        description:
            'When true, applies scheduled-ride rules from Figma (start must be strictly in the future vs “now”).',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isScheduled?: boolean;
}
