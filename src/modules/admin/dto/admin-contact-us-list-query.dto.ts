import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ContactUsSenderRole } from 'src/shared/schemas/contact-us-submission.schema';

export class AdminContactUsListQueryDto {
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

    @ApiPropertyOptional({ description: 'Filter by sender role', enum: ContactUsSenderRole })
    @IsOptional()
    @IsEnum(ContactUsSenderRole)
    senderRole?: ContactUsSenderRole;

    @ApiPropertyOptional({ description: 'Search first name, last name, email, or message body' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    search?: string;
}
