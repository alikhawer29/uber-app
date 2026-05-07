import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MultipartFormFieldsInterceptor } from 'src/common/interceptors/multipart-form-fields.interceptor';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { ListPromotionsQueryDto } from '../dto/list-promotions-query.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { UpdatePromotionStatusDto } from '../dto/update-promotion-status.dto';
import { AdminPromotionsService } from '../services/admin-promotions.service';

@ApiTags('Admin — Promotions')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseInterceptors(MultipartFormFieldsInterceptor)
@Controller('admin/promotions')
export class AdminPromotionsController {
    constructor(private readonly adminPromotionsService: AdminPromotionsService) { }

    @Post()
    @ApiOperation({ summary: 'Create promo code' })
    create(@Body() dto: CreatePromotionDto) {
        return this.adminPromotionsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List promo codes (paginated)' })
    list(@Query() query: ListPromotionsQueryDto) {
        return this.adminPromotionsService.list(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get promo code detail' })
    detail(@Param('id') id: string) {
        return this.adminPromotionsService.detail(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update promo code' })
    update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
        return this.adminPromotionsService.update(id, dto);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update promo status (active/inactive)' })
    updateStatus(@Param('id') id: string, @Body() dto: UpdatePromotionStatusDto) {
        return this.adminPromotionsService.updateStatus(id, dto);
    }
}

