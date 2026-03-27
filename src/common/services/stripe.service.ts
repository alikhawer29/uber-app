import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(private readonly configService: ConfigService) {
        this.stripe = new Stripe(this.configService.get<string>('stripe.secretKey') || '', {
            apiVersion: '2025-12-15.clover' as any,
        });
    }

    async createCustomer(email: string, name: string): Promise<string> {
        const customer = await this.stripe.customers.create({
            email,
            name,
        });
        return customer.id;
    }

    async ensureCustomer(user: { email: string; firstName: string; lastName: string; stripeCustomerId?: string }): Promise<string> {
        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const fullName = `${user.firstName} ${user.lastName}`;
        return this.createCustomer(user.email, fullName);
    }

    getStripe(): Stripe {
        return this.stripe;
    }
}
