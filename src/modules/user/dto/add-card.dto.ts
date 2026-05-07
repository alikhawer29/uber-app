import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Add a card using **one** of:
 * - `paymentMethodId` — from Stripe.js / mobile SDK (recommended production)
 * - `stripeToken` — e.g. `tok_visa` for Postman/tests (no raw card API needed)
 * - Raw `cardNumber` + `cvv` + `expireMonth` + `expireYear` — only if your Stripe account has raw card data APIs enabled
 */
export class AddCardDto {
    @ApiPropertyOptional({ description: 'Required for token/raw flows; optional if only attaching paymentMethodId' })
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    cardHolderName?: string;

    @ApiPropertyOptional({
        description: 'Stripe PaymentMethod id from Elements/SDK (pm_...)',
        example: 'pm_xxx',
    })
    @IsOptional()
    @IsString()
    paymentMethodId?: string;

    @ApiPropertyOptional({
        description: 'Stripe token for tests — use tok_visa in Postman instead of raw card numbers',
        example: 'tok_visa',
    })
    @IsOptional()
    @IsString()
    stripeToken?: string;

    @ApiPropertyOptional({ example: '4242424242424242' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{16}$/, { message: 'cardNumber must be exactly 16 digits' })
    cardNumber?: string;

    @ApiPropertyOptional({ example: '123' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{3}$/, { message: 'cvv must be exactly 3 digits' })
    cvv?: string;

    @ApiPropertyOptional({ example: '12' })
    @IsOptional()
    @IsString()
    @Matches(/^(0[1-9]|1[0-2])$/, { message: 'expireMonth must be 01-12' })
    expireMonth?: string;

    @ApiPropertyOptional({ example: '25', description: '2-digit year YY' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{2}$/, { message: 'expireYear must be 2 digits (YY)' })
    expireYear?: string;
}
