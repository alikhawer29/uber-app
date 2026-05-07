import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { UserCardRepository } from 'src/shared/repositories/user-card.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { WalletRepository } from 'src/shared/repositories/wallet.repository';
import { WalletTransactionRepository } from 'src/shared/repositories/wallet-transaction.repository';
import { WalletTransactionType } from 'src/shared/schemas/wallet-transaction.schema';
import { AddFundsDto } from '../dto/add-funds.dto';

@Injectable()
export class UserWalletService {
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

    async getBalance(userId: string) {
        const wallet = await this.walletRepository.getOrCreate(userId, 'USD');
        if (!wallet) throw new NotFoundException('Wallet not found');
        return {
            success: true,
            data: {
                balance: (wallet as any).balance,
                hasDues: (wallet as any).balance < 0,
                currency: (wallet as any).currency,
            },
        };
    }

    async addFunds(userId: string, dto: AddFundsDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        const card = await this.userCardRepository.findOwnedByUser(dto.cardId, userId);
        if (!card) {
            throw new BadRequestException({ code: 'CARD_NOT_FOUND', message: 'Card does not belong to this user' });
        }

        const wallet = await this.walletRepository.getOrCreate(userId, 'USD');
        if (!wallet) throw new NotFoundException('Wallet not found');

        const amountCents = Math.round(dto.amount * 100);
        if (amountCents < 100) {
            throw new BadRequestException({ code: 'INVALID_AMOUNT', message: 'Amount must be between 1.00 and 10000.00' });
        }

        const customerId = (user as any).stripeCustomerId;
        if (!customerId) {
            throw new BadRequestException({ code: 'PAYMENT_FAILED', message: 'Stripe customer is not configured for this user' });
        }

        let pi: Stripe.PaymentIntent;
        try {
            pi = await this.stripe.paymentIntents.create({
                amount: amountCents,
                currency: (wallet as any).currency.toLowerCase(),
                customer: customerId,
                payment_method: (card as any).stripePaymentMethodId,
                payment_method_types: ['card'],
                confirm: true,
                description: 'Wallet top-up',
                metadata: { userId },
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

        await this.walletRepository.incrementBalance(userId, dto.amount);
        await this.walletTransactionRepository.create({
            userId: (wallet as any).userId,
            type: WalletTransactionType.TOPUP,
            amount: dto.amount,
            currency: (wallet as any).currency,
            stripePaymentIntentId: pi.id,
        } as any);

        const updated = await this.walletRepository.getOrCreate(userId, (wallet as any).currency);
        return {
            success: true,
            message: 'Funds added successfully',
            data: { newBalance: (updated as any).balance, amountAdded: dto.amount },
        };
    }
}

