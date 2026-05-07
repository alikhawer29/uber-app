import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Types } from 'mongoose';
import { UserCardRepository } from 'src/shared/repositories/user-card.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { AddCardDto } from '../dto/add-card.dto';
import { EditCardDto } from '../dto/edit-card.dto';

@Injectable()
export class UserCardsService {
    private readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly userCardRepository: UserCardRepository,
    ) {
        const secretKey = this.configService.get<string>('stripe.secretKey');
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        this.stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });
    }

    async list(userId: string) {
        const cards = await this.userCardRepository.listByUser(userId);
        return {
            success: true,
            data: cards.map((c: any) => ({
                cardId: String(c._id),
                cardHolderName: c.cardHolderName,
                last4: c.last4,
                brand: c.brand,
                expireMonth: String(c.expireMonth).padStart(2, '0'),
                expireYear: String(c.expireYear).padStart(2, '0'),
                isDefault: !!c.isDefault,
            })),
        };
    }

    async add(userId: string, dto: AddCardDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        let customerId = (user as any).stripeCustomerId as string | undefined;
        if (!customerId) {
            const customer = await this.stripe.customers.create({
                email: (user as any).email,
                name: `${(user as any).firstName} ${(user as any).lastName}`.trim(),
                metadata: { userId },
            });
            customerId = customer.id;
            await this.userRepository.update(userId, { stripeCustomerId: customerId } as any);
        }

        const pmIdInput = dto.paymentMethodId?.trim();
        const tok = dto.stripeToken?.trim();
        const hasRaw =
            !!dto.cardNumber?.trim() &&
            !!dto.cvv?.trim() &&
            !!dto.expireMonth?.trim() &&
            !!dto.expireYear?.trim();

        if (!pmIdInput && !tok && !hasRaw) {
            throw new BadRequestException({
                code: 'VALIDATION_ERROR',
                message:
                    'Provide paymentMethodId (from Stripe Elements/SDK), stripeToken (e.g. tok_visa for tests), or full raw card fields if your Stripe account allows raw card APIs.',
            });
        }

        let pm: Stripe.PaymentMethod;
        try {
            if (pmIdInput) {
                pm = await this.stripe.paymentMethods.retrieve(pmIdInput);
                if (pm.type !== 'card' || !pm.card) {
                    throw new BadRequestException({ message: 'PaymentMethod must be a card' });
                }
                await this.stripe.paymentMethods.attach(pmIdInput, { customer: customerId });
                pm = await this.stripe.paymentMethods.retrieve(pmIdInput);
            } else if (tok) {
                pm = await this.stripe.paymentMethods.create({
                    type: 'card',
                    card: { token: tok },
                    billing_details: dto.cardHolderName?.trim()
                        ? { name: dto.cardHolderName.trim() }
                        : undefined,
                });
                await this.stripe.paymentMethods.attach(pm.id, { customer: customerId });
            } else {
                if (!dto.cardHolderName?.trim()) {
                    throw new BadRequestException({
                        message: 'cardHolderName is required when sending raw card fields',
                    });
                }
                pm = await this.stripe.paymentMethods.create({
                    type: 'card',
                    card: {
                        number: dto.cardNumber!,
                        exp_month: Number(dto.expireMonth),
                        exp_year: 2000 + Number(dto.expireYear),
                        cvc: dto.cvv!,
                    },
                    billing_details: { name: dto.cardHolderName.trim() },
                } as any);
                await this.stripe.paymentMethods.attach(pm.id, { customer: customerId });
            }
        } catch (e: any) {
            if (e instanceof BadRequestException) throw e;
            const msg =
                typeof e?.message === 'string'
                    ? e.message
                    : 'Stripe could not add this card';
            if (
                msg.includes('raw card') ||
                msg.includes('directly to the Stripe API') ||
                e?.code === 'payment_method_unexpected_state'
            ) {
                throw new BadRequestException({
                    code: 'STRIPE_CARD_API',
                    message:
                        'Raw card numbers are blocked on this Stripe account. Use stripeToken (e.g. tok_visa) in Postman, or paymentMethodId from Stripe Elements on mobile.',
                });
            }
            throw new BadRequestException({ code: 'STRIPE_ERROR', message: msg });
        }

        const existingCards = await this.userCardRepository.listByUser(userId);
        const isDefault = existingCards.length === 0;
        if (isDefault) {
            await this.stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: pm.id },
            } as any);
        }

        const holder =
            dto.cardHolderName?.trim() ||
            pm.billing_details?.name?.trim() ||
            `${(user as any).firstName} ${(user as any).lastName}`.trim() ||
            'Cardholder';

        const expYear = pm.card!.exp_year;
        const yy = expYear >= 2000 ? expYear - 2000 : expYear % 100;

        const card = await this.userCardRepository.create({
            userId: new Types.ObjectId(userId),
            cardHolderName: holder,
            brand: (pm.card?.brand || 'card').toString(),
            last4: pm.card?.last4 || '0000',
            expireMonth: pm.card!.exp_month,
            expireYear: yy,
            isDefault,
            stripePaymentMethodId: pm.id,
        } as any);

        if (isDefault) {
            await this.userCardRepository.setDefault(userId, String((card as any)._id));
        }

        return {
            message: 'Card added successfully',
            data: {
                cardId: String((card as any)._id),
                last4: (card as any).last4,
                brand: (card as any).brand,
            },
        };
    }

    async edit(userId: string, cardId: string, dto: EditCardDto) {
        const card = await this.userCardRepository.findOwnedByUser(cardId, userId);
        if (!card) throw new NotFoundException({ code: 'CARD_NOT_FOUND', message: 'Card not found' });

        const patch: any = {};
        if (dto.cardHolderName != null) patch.cardHolderName = dto.cardHolderName.trim();
        if (dto.expireMonth != null) patch.expireMonth = Number(dto.expireMonth);
        if (dto.expireYear != null) patch.expireYear = Number(dto.expireYear);

        await this.userCardRepository.update(cardId, patch);

        return { success: true, message: 'Card updated successfully' };
    }

    async remove(userId: string, cardId: string) {
        const card = await this.userCardRepository.findOwnedByUser(cardId, userId);
        if (!card) throw new NotFoundException({ code: 'CARD_NOT_FOUND', message: 'Card not found' });

        // Detach in Stripe (safe if already detached)
        try {
            await this.stripe.paymentMethods.detach((card as any).stripePaymentMethodId);
        } catch {
            // ignore
        }

        await this.userCardRepository.delete(cardId);
        return { success: true, message: 'Card deleted successfully' };
    }
}

