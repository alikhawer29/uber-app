import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { RidePaymentStatus, RidePaymentType } from 'src/common/constants/ride.constants';
import { roundMoney } from 'src/common/utils/geo-pricing.utils';
import { UserCardRepository } from 'src/shared/repositories/user-card.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { WalletRepository } from 'src/shared/repositories/wallet.repository';
import { WalletTransactionRepository } from 'src/shared/repositories/wallet-transaction.repository';
import { RideDocument } from 'src/shared/schemas/ride.schema';
import { WalletTransactionType } from 'src/shared/schemas/wallet-transaction.schema';

/**
 * Charges wallet or card when a ride is marked completed (rider ends trip).
 * Cash: marks paid without moving money (driver collects cash offline).
 */
@Injectable()
export class RidePaymentCaptureService {
    private readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
        private readonly walletRepository: WalletRepository,
        private readonly walletTransactionRepository: WalletTransactionRepository,
        private readonly userCardRepository: UserCardRepository,
        private readonly userRepository: UserRepository,
    ) {
        const secretKey = this.configService.get<string>('stripe.secretKey');
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        this.stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });
    }

    /**
     * Performs wallet deduction or Stripe charge. Caller sets ride COMPLETED + PAID after success.
     * Idempotent if ride.paymentStatus already PAID (no-op).
     */
    async captureForRideCompletion(ride: RideDocument): Promise<{ stripePaymentIntentId?: string | null }> {
        if (ride.paymentStatus === RidePaymentStatus.PAID) {
            return { stripePaymentIntentId: ride.stripePaymentIntentId ?? null };
        }

        const amount = roundMoney((ride as any).totalAmount ?? 0);
        if (amount <= 0) {
            return {};
        }

        const userId = String((ride as any).userId);

        switch (ride.paymentType as RidePaymentType) {
            case RidePaymentType.WALLET:
                await this.captureWallet(userId, ride, amount);
                return {};

            case RidePaymentType.CARD:
                return await this.captureCard(userId, ride, amount);

            case RidePaymentType.CASH:
                return {};

            default:
                throw new BadRequestException({
                    code: 'UNSUPPORTED_PAYMENT',
                    message: 'Unsupported payment type for this ride',
                });
        }
    }

    private async captureWallet(userId: string, ride: RideDocument, amount: number) {
        const wallet = await this.walletRepository.getOrCreate(userId, 'USD');
        if (!wallet) {
            throw new BadRequestException({ code: 'WALLET_NOT_FOUND', message: 'Wallet not found' });
        }
        const balance = roundMoney((wallet as any).balance ?? 0);
        if (balance < amount) {
            throw new BadRequestException({
                code: 'INSUFFICIENT_WALLET_BALANCE',
                message: `Insufficient wallet balance. Required ${amount}, available ${balance}`,
            });
        }

        await this.walletRepository.incrementBalance(userId, -amount);
        await this.walletTransactionRepository.create({
            userId: (wallet as any).userId,
            type: WalletTransactionType.DEDUCT,
            amount: -amount,
            currency: (wallet as any).currency ?? 'USD',
            note: `Ride fare ${String((ride as any)._id)}`,
        } as any);
    }

    private async captureCard(
        userId: string,
        ride: RideDocument,
        amount: number,
    ): Promise<{ stripePaymentIntentId: string }> {
        const cardId = (ride as any).cardId;
        if (!cardId) {
            throw new BadRequestException({
                code: 'CARD_NOT_FOUND',
                message: 'Ride has no saved card for payment',
            });
        }

        const card = await this.userCardRepository.findOwnedByUser(String(cardId), userId);
        if (!card) {
            throw new BadRequestException({
                code: 'CARD_NOT_FOUND',
                message: 'Card does not belong to this user',
            });
        }

        const user = await this.userRepository.findById(userId);
        const customerId = (user as any)?.stripeCustomerId;
        if (!customerId) {
            throw new BadRequestException({
                code: 'PAYMENT_FAILED',
                message: 'Stripe customer is not configured for this user',
            });
        }

        const wallet = await this.walletRepository.getOrCreate(userId, 'USD');
        const currency = ((wallet as any)?.currency ?? 'usd').toLowerCase();

        let pi: Stripe.PaymentIntent;
        try {
            pi = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency,
                customer: customerId,
                payment_method: (card as any).stripePaymentMethodId,
                payment_method_types: ['card'],
                confirm: true,
                description: `Ride fare ${String((ride as any)._id)}`,
                metadata: {
                    rideId: String((ride as any)._id),
                    userId,
                },
            });
        } catch (e: any) {
            const msg = typeof e?.message === 'string' ? e.message : 'Card payment failed';
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

        return { stripePaymentIntentId: pi.id };
    }
}
