import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SavedPlaceListQueryDto {
    @ApiPropertyOptional({
        description: 'Filter saved places by name or address (matches Figma search)',
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    search?: string;
}
