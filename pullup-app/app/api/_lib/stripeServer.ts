import { NextResponse } from 'next/server';
import Stripe from 'stripe';

let cachedStripe: Stripe | null = null;

export const getStripeClient = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) return null;

    if (!cachedStripe) {
        cachedStripe = new Stripe(secretKey, {
            apiVersion: '2026-01-28.clover',
        });
    }

    return cachedStripe;
};

export const stripeConfigErrorResponse = () =>
    NextResponse.json(
        { error: 'Payment service temporarily unavailable' },
        { status: 503 },
    );
