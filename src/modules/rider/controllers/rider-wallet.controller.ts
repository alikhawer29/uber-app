import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { AddFundsDto } from 'src/modules/user/dto/add-funds.dto';
import { RiderWalletService } from '../services/rider-wallet.service';

@ApiTags('Rider — Wallet')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider/wallet')
export class RiderWalletController {
    constructor(private readonly riderWalletService: RiderWalletService) {}

    @Get()
    @ApiOperation({ summary: 'Wallet balance (includes dues status)' })
    balance(@CurrentUser() rider: { id: string }) {
        return this.riderWalletService.getBalance(rider.id);
    }

    @Post('add-funds')
    @ApiOperation({
        summary: 'Add funds via card (clear dues or top up)',
        description: 'Use a saved card from GET /rider/cards. Required when balance is negative to receive rides.',
    })
    addFunds(@CurrentUser() rider: { id: string }, @Body() dto: AddFundsDto) {
        return this.riderWalletService.addFunds(rider.id, dto);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Wallet transaction history' })
    transactions(
        @CurrentUser() rider: { id: string },
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.riderWalletService.listTransactions(rider.id, Number(page) || 1, Number(limit) || 20);
    }
}
