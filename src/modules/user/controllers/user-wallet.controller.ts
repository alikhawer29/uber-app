import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/constants/user.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AddFundsDto } from '../dto/add-funds.dto';
import { UserWalletService } from '../services/user-wallet.service';

@ApiTags('User — Wallet')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/wallet')
export class UserWalletController {
    constructor(private readonly userWalletService: UserWalletService) { }

    @Get()
    @ApiOperation({ summary: 'Get wallet balance' })
    getBalance(@CurrentUser() user: { id: string }) {
        return this.userWalletService.getBalance(user.id);
    }

    @Post('add-funds')
    @ApiOperation({ summary: 'Add funds to wallet via Stripe' })
    addFunds(@CurrentUser() user: { id: string }, @Body() dto: AddFundsDto) {
        return this.userWalletService.addFunds(user.id, dto);
    }
}

