import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { RiderWalletService } from '../services/rider-wallet.service';

@ApiTags('Rider — Wallet')
@ApiBearerAuth()
@Roles(UserRole.RIDER)
@Controller('rider/wallet')
export class RiderWalletController {
    constructor(private readonly riderWalletService: RiderWalletService) {}

    @Get()
    @ApiOperation({ summary: 'Wallet balance (earnings + top-ups)' })
    balance(@CurrentUser() rider: { id: string }) {
        return this.riderWalletService.getBalance(rider.id);
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
