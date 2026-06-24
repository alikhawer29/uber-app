import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AdminCommissionHistoryQueryDto } from '../dto/admin-commission-history-query.dto';
import { SetCommissionRateDto } from '../dto/set-commission-rate.dto';
import { SetPayoutDaysDto } from '../dto/set-payout-days.dto';
import { AdminCommissionService } from '../services/admin-commission.service';

@ApiTags('Admin — Commission & Payout')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/commission')
export class AdminCommissionController {
    constructor(private readonly adminCommissionService: AdminCommissionService) {}

    @Get('current')
    @ApiOperation({ summary: 'Get current commission rate' })
    async currentCommission() {
        return this.adminCommissionService.getCurrentCommission();
    }

    @Post('rate')
    @ApiOperation({ summary: 'Set a new commission rate' })
    async setRate(@Body() dto: SetCommissionRateDto) {
        return this.adminCommissionService.setCommissionRate(dto);
    }

    @Get('history')
    @ApiOperation({ summary: 'Commission rate change history' })
    async commissionHistory(@Query() query: AdminCommissionHistoryQueryDto) {
        return this.adminCommissionService.listCommissionHistory(query);
    }

    @Get('payout/current')
    @ApiOperation({ summary: 'Get current payout days setting' })
    async currentPayout() {
        return this.adminCommissionService.getCurrentPayout();
    }

    @Post('payout')
    @ApiOperation({ summary: 'Set payout days' })
    async setPayout(@Body() dto: SetPayoutDaysDto) {
        return this.adminCommissionService.setPayoutDays(dto);
    }

    @Get('payout/history')
    @ApiOperation({ summary: 'Payout days change history' })
    async payoutHistory(@Query() query: AdminCommissionHistoryQueryDto) {
        return this.adminCommissionService.listPayoutHistory(query);
    }
}
