This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production Security Configuration

Set these environment variables in production before go-live:

- `ACCESS_LOCK_CODE` - launch gate code (no defaults in production).
- `ACCESS_LOCK_SECRET` - minimum 32 characters.
- `ALLOWED_ORIGINS` - comma-separated HTTPS origins allowed to call API routes.
	- Example: `https://pullupcoffee.com.au,https://www.pullupcoffee.com.au`
- `ADMIN_API_TOKEN` - long random token for admin endpoints.
- `STRIPE_SECRET_KEY` - Stripe secret key from secure secret storage.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` - Twilio credentials.

Operational hardening requirements:

- Rotate `ADMIN_API_TOKEN` and `ACCESS_LOCK_SECRET` on a regular schedule.
- Keep all secrets in hosting provider secret manager (never in source control).
- Keep `ALLOWED_ORIGINS` strict and avoid wildcard domains.
- Enable HTTPS-only deployment and keep HSTS enabled.
- Monitor API `401`, `403`, and `429` response rates for abuse detection.
