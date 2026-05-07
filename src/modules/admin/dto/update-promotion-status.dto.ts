import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AdminPromotionStatusDto } from './create-promotion.dto';

export class UpdatePromotionStatusDto {
    @ApiProperty({ enum: AdminPromotionStatusDto })
    @IsEnum(AdminPromotionStatusDto)
    status: AdminPromotionStatusDto;
}

