import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class TestPushDto {
    @ApiProperty({ required: false, description: 'Target user id (defaults to your own admin user if omitted)' })
    @IsMongoId()
    @IsOptional()
    userId?: string;

    @ApiProperty({ required: false, example: 'Test push' })
    @IsString()
    @IsOptional()
    @MaxLength(120)
    title?: string;

    @ApiProperty({ required: false, example: 'If you see this, FCM is working.' })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    body?: string;
}
