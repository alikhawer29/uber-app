import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { roundMoney } from 'src/common/utils/geo-pricing.utils';
import { UserCardRepository } from 'src/shared/repositories/user-card.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { WalletRepository } from 'src/shared/repositories/wallet.repository';
import { WalletTransactionRepository } from 'src/shared/repositories/wallet-transaction.repository';
import { WalletTransactionType } from 'src/shared/schemas/wallet-transaction.schema';
import { AddFundsDto } from 'src/modules/user/dto/add-funds.dto';

@Injectable()
export class RiderWalletService {
    private readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
        private readonly walletRepository: WalletRepository,
        private readonly walletTransactionRepository: WalletTransactionRepository,
        private readonly userRepository: UserRepository,
        private readonly userCardRepository: UserCardRepository,
    ) {
        const secretKey = this.configService.get<string>('stripe.secretKey');
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        this.stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });
    }

    async getBalance(riderId: string) {
        const wallet = await this.walletRepository.getOrCreate(riderId, 'USD');
        if (!wallet) throw new NotFoundException({ code: 'WALLET_NOT_FOUND', message: 'Wallet not found' });

        const balance = roundMoney((wallet as any).balance ?? 0);
        const hasDues = balance < 0;

        return {
            success: true,
            data: {
                balance,
                hasDues,
                duesAmount: hasDues ? Math.abs(balance) : 0,
                canReceiveRides: !hasDues,
                currency: (wallet as any).currency ?? 'USD',
                message: hasDues
                    ? 'Clear your wallet dues to receive and accept rides. Use POST /rider/wallet/add-funds.'
                    : null,
            },
        };
    }

    async assertCanReceiveRides(riderId: string) {
        const wallet = await this.walletRepository.getOrCreate(riderId, 'USD');
        const balance = roundMoney((wallet as any)?.balance ?? 0);
        if (balance < 0) {
            throw new ForbiddenException({
                code: 'WALLET_DUES_PENDING',
                message: 'Clear your wallet dues before going online or accepting rides',
                duesAmount: Math.abs(balance),
            });
        }
    }

    async hasWalletDues(riderId: string): Promise<boolean> {
        const wallet = await this.walletRepository.getOrCreate(riderId, 'USD');
        return roundMoney((wallet as any)?.balance ?? 0) < 0;
    }

    async addFunds(riderId: string, dto: AddFundsDto) {
        const user = await this.userRepository.findById(riderId);
        if (!user) throw new NotFoundException('Rider not found');

        const card = await this.userCardRepository.findOwnedByUser(dto.cardId, riderId);
        if (!card) {
            throw new BadRequestException({ code: 'CARD_NOT_FOUND', message: 'Card does not belong to this rider' });
        }

        const wallet = await this.walletRepository.getOrCreate(riderId, 'USD');
        if (!wallet) throw new NotFoundException('Wallet not found');

        const amountCents = Math.round(dto.amount * 100);
        if (amountCents < 100) {
            throw new BadRequestException({
                code: 'INVALID_AMOUNT',
                message: 'Amount must be between 1.00 and 10000.00',
            });
        }

        const customerId = (user as any).stripeCustomerId;
        if (!customerId) {
            throw new BadRequestException({
                code: 'PAYMENT_FAILED',
                message: 'Stripe customer is not configured. Add a card first.',
            });
        }

        let pi: Stripe.PaymentIntent;
        try {
            pi = await this.stripe.paymentIntents.create({
                amount: amountCents,
                currency: ((wallet as any).currency ?? 'usd').toLowerCase(),
                customer: customerId,
                payment_method: (card as any).stripePaymentMethodId,
                payment_method_types: ['card'],
                confirm: true,
                description: 'Rider wallet top-up',
                metadata: { riderId },
            });
        } catch (e: any) {
            const msg = typeof e?.message === 'string' ? e.message : 'Stripe payment failed';
            throw new BadRequestException({ code: 'PAYMENT_FAILED', message: msg });
        }

        if (pi.status !== 'succeeded') {
            throw new BadRequestException({
                code: 'PAYMENT_FAILED',
                message:
                    pi.last_payment_error?.message ||
                    `Payment status is ${pi.status}; complete authentication if required`,
            });
        }

        await this.walletRepository.incrementBalance(riderId, dto.amount);
        await this.walletTransactionRepository.create({
            userId: (wallet as any).userId,
            type: WalletTransactionType.TOPUP,
            amount: dto.amount,
            currency: (wallet as any).currency ?? 'USD',
            stripePaymentIntentId: pi.id,
            note: 'Wallet top-up',
        } as any);

        const updated = await this.walletRepository.getOrCreate(riderId, (wallet as any).currency);
        const newBalance = roundMoney((updated as any).balance ?? 0);

        return {
            success: true,
            message: newBalance < 0 ? 'Funds added. You still have outstanding dues.' : 'Funds added successfully',
            data: {
                newBalance,
                amountAdded: dto.amount,
                hasDues: newBalance < 0,
                duesAmount: newBalance < 0 ? Math.abs(newBalance) : 0,
                canReceiveRides: newBalance >= 0,
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
