import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/constants/user.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AddUserPromoDto } from '../dto/add-user-promo.dto';
import { UserPromotionsService } from '../services/user-promotions.service';

@ApiTags('User — Promotions')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/promotions')
export class UserPromotionsController {
    constructor(private readonly userPromotionsService: UserPromotionsService) { }

    @Get()
    @ApiOperation({ summary: 'List user promotions' })
    list(@CurrentUser() user: { id: string }) {
        return this.userPromotionsService.list(user.id);
    }

    @Post('add')
    @ApiOperation({ summary: 'Add promo code to user promotions list' })
    add(@CurrentUser() user: { id: string }, @Body() dto: AddUserPromoDto) {
        return this.userPromotionsService.add(user.id, dto.promoCode);
    }
}

