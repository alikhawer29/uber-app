import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletRepository } from 'src/shared/repositories/wallet.repository';
import { WalletTransactionRepository } from 'src/shared/repositories/wallet-transaction.repository';

@Injectable()
export class RiderWalletService {
    constructor(
        private readonly walletRepository: WalletRepository,
        private readonly walletTransactionRepository: WalletTransactionRepository,
    ) {}

    async getBalance(riderId: string) {
        const wallet = await this.walletRepository.getOrCreate(riderId, 'USD');
        if (!wallet) throw new NotFoundException({ code: 'WALLET_NOT_FOUND', message: 'Wallet not found' });
        return {
            success: true,
            data: {
                balance: (wallet as any).balance,
                currency: (wallet as any).currency ?? 'USD',
            },
        };
    }

    async listTransactions(riderId: string, page: number, limit: number) {
        const result = await this.walletTransactionRepository.listByUser(riderId, page, limit);
        return {
            success: true,
            data: {
                transactions: result.data.map((t: any) => ({
                    id: String(t._id),
                    type: t.type,
                    amount: t.amount,
                    currency: t.currency ?? 'USD',
                    note: t.note ?? null,
                    createdAt: t.createdAt,
                })),
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                },
            },
        };
    }
}
