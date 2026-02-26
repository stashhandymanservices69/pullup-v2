# Pull Up Coffee - System Web Tree (A4 Printable)

## 1) User Flows
- Customer -> Landing -> Discovery -> Cafe Menu -> Checkout -> Stripe Checkout -> Tracking
- Merchant -> Merchant Portal -> Apply/Login -> Cafe Dashboard
- Supporter -> Landing -> Merchandise -> Stripe Merch Checkout

## 2) Runtime Components
- Frontend App: Next.js App Router (single-page flow in app/page.tsx)
- Database/Auth: Firebase (Firestore + Auth)
- Payments: Stripe Checkout + Stripe Connect
- Notifications: Twilio SMS API route
- Admin Security Layer: Token-protected admin endpoints + rate limiting

## 3) API Tree
- /api/stripe/checkout
  - input: cart, orderId, fee
  - output: Stripe checkout URL for coffee orders

- /api/stripe/merch
  - input: none
  - output: Stripe checkout URL for hat + shipping address collection

- /api/stripe/connect
  - input: email, businessName, cafeId, referralCode
  - output: Stripe onboarding URL

- /api/stripe/verify
  - input: stripeId
  - output: charges_enabled + payouts_enabled state

- /api/twilio
  - input: to, message
  - output: SMS sid (or simulated sid fallback)

- /api/admin/cafes/pending
  - auth: x-admin-token or Bearer token
  - output: unapproved cafe list

- /api/admin/cafes/approve
  - auth: x-admin-token or Bearer token
  - input: cafeId
  - output: sets cafe to approved/open

## 4) Security Dependencies
- next.config.ts -> global security headers (CSP, HSTS, Referrer Policy, X-Frame, etc.)
- app/api/_lib/adminAuth.ts -> admin token validation + API rate limiting
- app/api/_lib/firebaseAdmin.ts -> server-only firebase-admin bootstrap from environment secrets
- Environment Variables -> all secrets outside source code

## 5) Data Dependencies
- cafes collection
  - merchant profile, status, approval, pricing
- cafes/{id}/menu subcollection
  - products and active flags
- orders collection
  - customer order payload, status, arrival state

## 6) Mermaid Architecture (print-friendly)

```mermaid
flowchart TB
  C[Customer Browser] --> A[Next.js Frontend]
  M[Merchant Browser] --> A
  S[Supporter Browser] --> A

  A --> F[Firebase Auth]
  A --> D[Firestore]
  A --> SC[/api/stripe/checkout]
  A --> SM[/api/stripe/merch]
  A --> TW[/api/twilio]

  SC --> STRIPE[Stripe Checkout]
  SM --> STRIPE
  A --> CON[/api/stripe/connect]
  CON --> STRIPE
  A --> VER[/api/stripe/verify]
  VER --> STRIPE

  TW --> TWC[Twilio]

  ADM[Admin Operator] --> AP[/api/admin/cafes/pending]
  ADM --> AA[/api/admin/cafes/approve]
  AP --> D
  AA --> D
```
