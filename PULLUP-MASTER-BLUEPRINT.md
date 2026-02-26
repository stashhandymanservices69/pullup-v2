# 🏎️ PULL UP COFFEE: Master Execution Blueprint 🇦🇺
**Status:** Founder Execution Mode | **Target:** AU MVP to National Scale

## 1. Executive Reality Check
Pull Up Coffee's core value prop—turning street parking into a virtual drive-thru—is a lethal differentiator against delivery giants. By emphasizing cafe profitability through a **0% commission + "Runner Bonus" model**, you are building highly defensible B2B software disguised as a consumer app. 

However, the current MVP architecture is brittle:
*   **Margin Risk:** Fixed platform fees combined with Stripe's percentage fees will bankrupt you on large orders.
*   **Performance:** The monolithic frontend (`page.tsx`) risks crashes on older mobile devices and kills SEO.
*   **Security:** In-memory rate limiting fails on Vercel Edge, leaving you exposed to Twilio toll fraud.
*   **Operations:** Uncaptured Stripe authorizations without an automated cron sweeper will lead to "ghost holds" and ACL disputes.

**Launch Readiness Decision Gates:**
*   *Gate 1 (Code):* Do not launch until Upstash Edge Rate Limiting and the Dynamic Pass-Through pricing algorithm are live.
*   *Gate 2 (Pilot):* If < 5 pilot cafes commit with signed terms, delay go-live and focus entirely on the B2B pitch.
*   *Gate 3 (Scale):* If the pilot hits an 85% order completion rate with < 3% merchant rejections, greenlight national rollout.

---

## 2. Priority Action Matrix

| Priority | Item | Why it matters | Effort | Impact | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CRITICAL** | **Dynamic Fee Math** | Protects platform margin. Flat fees bankrupt you on large orders via Stripe %. | Low | High | Platform nets exactly $1.00; Stripe % dynamically passed to customer. |
| **CRITICAL** | **Refactor `page.tsx`** | Monolith bloats JS (>200KB), slows old devices, breaks history/SEO. | Med | High | Separate routes load <100ms on 3G; back button works natively. |
| **CRITICAL** | **Edge Rate Limiting** | In-memory fails on Vercel; exposes to Twilio SMS fraud ($0.05+/msg). | Low | High | Upstash blocks >5 req/min/IP; logs anomalies. |
| **CRITICAL** | **Auto-Cancel Cron** | "Ghost holds" lock customer funds for 7 days if cafes are too busy. | Low | High | Scans every 5min; auto-cancels holds >5min old; SMS notifies user. |
| **HIGH** | **Audible Merchant Alerts** | Silent UI misses in noisy cafes; leads to cold coffee & rejections. | Low | High | Web Audio API plays chime loop until accept/reject is tapped. |
| **HIGH** | **GPS Denial Fallback** | 40% bounce on instant prompt; Safari backgrounding kills location. | Low | Med | Deferred prompt. Massive "I'm Outside" manual override button. |
| **HIGH** | **Legal Terms Rewrite** | Current docs vague on liability; risks ACL suits for food safety. | Med | High | Defines Pull Up strictly as "Platform Bridge"; AU counsel signs off. |
| **MED** | **Twilio Hard-Caps** | Costs $0.10/order. Scales to a margin killer if baristas spam update buttons. | Low | Med | Hard-cap server-side: max 2 SMS per `orderId`. |
| **MED** | **Min Cart / Max Fee limits** | Prevents fee bleed on tiny orders and cart abandonment from greedy cafes. | Low | Med | Enforces $5.00 cart minimum. Caps Cafe Runner Fee slider at $6.00. |

---

## 3. Commercial Engine: The "Dynamic Pass-Through"
**The Trap:** If you charge a flat $1.00 platform fee, and a customer orders $60 of coffee, Stripe charges you $1.44 (1.75% + 30c). You lose $0.44 out of pocket.
**The Moat:** You let the Cafe set their own "Curbside Runner Fee" ($2 to $6 max). Your code dynamically calculates exactly what Stripe will charge, passes that total to the customer, and leaves Pull Up Coffee with exactly **$1.00 net revenue** per order.

*   **The Formula:** `Total Charge = Math.ceil((Menu + Cafe Fee + $1.00 Target + $0.30 Stripe Fixed) / (1 - 0.0175 Stripe %))`
*   **The Result:** The customer pays the exact overhead. Stripe takes its cut from the top. The Cafe gets 100% of their Menu + Bonus. Pull Up nets exactly $1.00 (yielding $0.90 pure profit after $0.10 Twilio costs).

---

## 4. Product / UX Upgrades (Mobile-First)
*   **App Router Decomposition:** Split monolithic state into discrete App Router pages (`/search`, `/menu/[id]`, `/track`). Reduces initial payload for old phones.
*   **Progressive Loading States:** Implement Tailwind skeleton loaders. Content must appear <2s on throttled 3G to prevent bounces.
*   **High-Contrast Toggle:** Implement for users reading screens in direct Australian sunlight from their cars.
*   **Deferred Vehicle Details:** Make vehicle details (Make/Color/Rego) optional *after* checkout to reduce pre-pay friction.

---

## 5. GPS/Discovery & Checkout Trust Flow
*   **Deferred GPS Prompt:** Do not prompt location on page load. Prompt only when a user taps "Find Cafes Near Me". Provide a Suburb/Postcode text fallback if denied.
*   **"I'm Outside" Override:** iOS Safari kills background geolocation. You *must* have a manual "I'm Here! Notify Cafe" button to handle VPNs and stale coordinates.
*   **Transparent Fee Split:** Build checkout trust. Group the Cafe's fee and your fee into one line item: *"Curbside Runner & Service Fee."*
*   **Apple/Google Pay Priority:** Bypassing manual card entry is 40% faster on mobile. Make Stripe Express Checkout the default UI.

---

## 6. Security + Abuse Prevention Hardening
*   **Upstash Edge Limits:** Protects Twilio/Stripe endpoints. Serverless in-memory maps reset constantly and offer zero protection.
*   **Firebase Write Limits:** Update Firestore rules to block >3 pending orders per user per hour to prevent cafe queue spam.
*   **Stripe Radar Integration:** Turn on risk scoring in the dashboard to natively flag and block card-testing bots.
*   **Business Verification:** Enforce a manual ABN upload and admin approval in the Merchant onboarding flow before a cafe can go "Live."

---

## 7. Legal Policy Rewrite Directives (AU-First)
*Give these exact directives to your AU Commercial Lawyer:*
*   **Terms of Use ("Platform Bridge"):** "Pull Up Coffee acts strictly as a technology provider and limited payment collection agent. Title to goods, food safety, and allergen responsibility passes directly from the Cafe to the Customer."
*   **Privacy Policy (APP Compliant):** "Live GPS data is utilized transiently for ETA estimation and is obfuscated/deleted 24 hours post-order."
*   **Cafe Partner Terms:** "Cafes bear 100% of the risk for credit card chargebacks on completed orders. Payouts follow standard Stripe Connect destination schedules."
*   **Affiliate Acceptable Use:** "Referral payouts are locked for 30 days to clear statutory chargeback windows. Self-referrals instantly void the contract."

---

## 8. App-Store Path & Scale Strategy
**Recommendation: CapacitorJS Wrapper**
Do not rebuild in React Native. Use CapacitorJS to wrap your Next.js web app into a native shell. 
*   **Why:** Retains your single codebase. Physical goods are exempt from the 30% Apple Tax (Guideline 3.1.5).
*   **The Margin Kicker:** Native apps unlock Push Notifications. Once adopted, you swap $0.10 Twilio SMS texts for $0.00 Push Notifications, instantly increasing your net profit per order by 11%.
*   **Milestones:** Week 4: Install Capacitor. Week 8: Test APNS/FCM Push. Week 12: Submit to App Store.

---

## 9. Operations Automation Model (Founder-Light)
*   **Passive Webhooks:** Route Vercel/Firebase errors to Slack. Only check logs if: Twilio spend > $10/day, or API 500 errors > 2%.
*   **Auto-Purge & Sweeps:** Rely entirely on the 5-minute Vercel Cron to handle stale Stripe holds. Zero manual daily review required.
*   **Hiring Trigger:** Automate everything until manual dispute/support volume exceeds 1 hour per day, OR you cross 50 active cafes. Only then, hire a remote Ops VA.

---

## 10. 30/60/90 Day Execution Plan

**Days 1-30: Core Architecture Survival**
*   Refactor routes, deploy Upstash limits, code the Dynamic Pass-Through, set up the Auto-Cancel Cron.
*   **Gate:** 80% pilot orders complete. No-go if >5% merchant rejections.

**Days 31-60: Hyper-Local Pilot Launch**
*   Go live with 3-5 cafes on a *single inbound arterial road*. Deploy physical A-Frame signage. Secure legal sign-off.
*   **Gate:** 100 live orders processed. No-go if margin drops below $0.90 net per order.

**Days 61-90: App Store & Affiliate Flywheel**
*   Submit Capacitor wrapper to stores. Launch B2B Affiliate dashboard (Cafes refer Cafes for a % of platform fee).
*   **Gate:** App approved by Apple. No-go if chargeback/dispute rate > 1%.

---

## 11. Week 1 Code Implementation Pack (Copy-Paste Ready)

### A. Next.js App Router Target Architecture
```text
/app
 ├── (public)/page.tsx                  // Landing Page
 ├── (customer)/search/page.tsx         // GPS Discovery
 ├── (customer)/cafe/[id]/page.tsx      // Cafe Menu
 ├── (customer)/track/[orderId]/page.tsx// Tracking & Manual Override
 ├── (merchant)/admin/page.tsx          // Dashboard + Audio Alerts
 └── api/
      ├── stripe/checkout/route.ts      // Dynamic Pass-Through Engine
      ├── cron/sweep/route.ts           // Ghost-Hold Sweeper
      └── twilio/route.ts               // SMS Hard-capped
```

### B. Global Edge Rate Limiting (`middleware.ts`)

*Run `npm i @upstash/ratelimit @upstash/redis`*

```typescript
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Fallback wrapper so site stays up if Redis drops
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 req/min per IP
});

export async function middleware(req: Request) {
  if (req.nextUrl.pathname.startsWith('/api/stripe') || req.nextUrl.pathname.startsWith('/api/twilio')) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    try {
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        console.warn(`[SECURITY] Rate limit hit for IP: ${ip}`);
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } catch (err) {
      console.error('Redis Ratelimit down, failing open');
    }
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
```

### C. The Dynamic Pass-Through Engine (`app/api/stripe/checkout/route.ts`)

```typescript
import { stripe } from '@/lib/stripeServer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { cartSubtotalCents, cafeCurbsideFeeCents, cafeStripeAccountId } = await req.json();

  // strict margin guardrails
  if (cartSubtotalCents < 500) return NextResponse.json({ error: 'Min order is $5.00' }, { status: 400 });
  if (cafeCurbsideFeeCents > 600) return NextResponse.json({ error: 'Max runner fee is $6.00' }, { status: 400 });

  const baseAmountCents = cartSubtotalCents + cafeCurbsideFeeCents;
  const TARGET_PULLUP_NET_CENTS = 100; // You always clear $1.00 net
  const STRIPE_FIXED_CENTS = 30; // AU Domestic
  const STRIPE_PERCENTAGE = 0.0175; // AU Domestic 1.75%

  // The Absolute Pass-Through Math (Math.ceil prevents rounding losses)
  const totalChargeCents = Math.ceil(
    (baseAmountCents + TARGET_PULLUP_NET_CENTS + STRIPE_FIXED_CENTS) / (1 - STRIPE_PERCENTAGE)
  );

  const applicationFeeCents = totalChargeCents - baseAmountCents;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'apple_pay', 'google_pay'],
    line_items: [
      {
        price_data: { currency: 'aud', product_data: { name: 'Order Subtotal' }, unit_amount: cartSubtotalCents },
        quantity: 1,
      },
      {
        // Bundles cafe fee + your dynamic fee into one clean line item
        price_data: { currency: 'aud', product_data: { name: 'Curbside Runner & Service Fee' }, unit_amount: totalChargeCents - cartSubtotalCents },
        quantity: 1,
      }
    ],
    mode: 'payment',
    payment_intent_data: {
      transfer_data: { destination: cafeStripeAccountId },
      application_fee_amount: applicationFeeCents, // Stripe deducts from this. Pull Up keeps exactly $1.00.
      capture_method: 'manual', // Hold funds until cafe accepts
    },
    success_url: `${req.headers.get('origin')}/track/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.get('origin')}/menu`,
  });

  return NextResponse.json({ url: session.url });
}
```

### D. The Ghost Hold Sweeper (`app/api/cron/sweep/route.ts`)

*Configure in `vercel.json` with `{ "crons": [{ "path": "/api/cron/sweep", "schedule": "*/5 * * * *" }] }`*

```typescript
import { stripe } from '@/lib/stripeServer';
import admin from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent Vercel caching

export async function GET(req: Request) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = admin.firestore();
  const fiveMinsAgo = Date.now() - 300000;

  const pendingOrders = await db.collection('orders')
    .where('status', '==', 'pending')
    .where('createdAt', '<', fiveMinsAgo)
    .get();

  await Promise.all(pendingOrders.docs.map(async (doc) => {
    const order = doc.data();
    try {
      if (order.paymentIntentId) {
        await stripe.paymentIntents.cancel(order.paymentIntentId);
      }
      await doc.ref.update({ 
        status: 'auto_rejected', 
        updatedAt: Date.now(), 
        rejectReason: 'Cafe Timeout' 
      });
      // TODO: Trigger 1x Twilio SMS to customer: "Cafe is too busy, your hold was released."
    } catch (error) {
      console.error(`Failed to sweep order ${doc.id}:`, error);
    }
  }));

  return NextResponse.json({ swept: pendingOrders.size });
}
```

---

## 12. Detailed Analysis Output

### Executive Reality Check

Pull Up Coffee's core value prop—turning street parking into a virtual drive-thru—remains a strong differentiator against delivery giants, emphasizing cafe profitability through a "runner bonus" model rather than commissions. However, the current MVP is fragile: monolithic frontend logic risks crashes on low-end devices, in-memory security fails against scaled abuse, and unoptimized GPS/tracking invites disputes. Legal docs lack enforceability, exposing you to ACL/Privacy Act claims. Economics hinge on precise fee splits—$2 curbside fee with $1 cafe bonus yields viability, but SMS overuse or low AOV erodes margins. High-risk assumptions: assuming cafes will consistently manage orders without audible alerts (leading to cold orders); Twilio fallback simulation hides real costs in production; no automated fraud checks invite ghost orders. Contradiction flagged: Merchant UI mentions payout preferences (daily/weekly), but code relies on Stripe defaults, risking mismatched expectations.

Decision tree for launch readiness:
- If <5 pilot cafes commit with signed terms: Delay go-live, focus merchant acquisition.
- If pilot hits 80% order completion rate: Proceed to national rollout.
- Else: Revert to suburb-only discovery to reduce GPS failures.

### Detailed Priority Matrix

| Priority | Item | Why it matters | Effort (S/M/L) | Impact (Low/Med/High) | Dependencies | Acceptance Criteria |
|----------|------|----------------|----------------|-----------------------|--------------|----------------------|
| Critical | Refactor page.tsx into routed components | Monolith bloats JS (200KB+), slows old devices, breaks history/SEO. | M | High | Next.js docs | Separate routes load <100ms on 3G; back button navigates views without reload. |
| Critical | Implement edge rate limiting | In-memory fails on Vercel; exposes to SMS fraud ($0.05+/msg). | S | High | Upstash setup | Blocks >5 req/min/IP; logs attempts in Vercel. |
| Critical | Add auto-cancel cron for stale intents | Ghost holds lock funds 7 days, erodes trust. | S | High | Vercel Cron, Stripe API | Scans every 5min; cancels if >5min pending; SMS notifies. |
| High | Audible merchant alerts | Silent UI misses in noisy cafes; leads to rejections. | S | High | Browser Audio API | Plays chime loop until accept/reject; stops on action. |
| High | GPS denial fallback | 40% bounce on prompt; blocks discovery. | S | Med | Geolocation API | Prompt on "Find Cafes" tap; suburb input if denied. |
| High | Legal terms rewrite | Current docs vague on liability; risks ACL suits. | M | High | AU counsel review | Defines "platform bridge"; counsel signs off. |
| Medium | Optimize Twilio to 2 msgs/order | Costs $0.10/order; scales to margin killer. | S | Med | Twilio route logic | Hard-cap per orderId; fallback to UI updates. |
| Medium | Minimum AOV enforcement | Low orders ($<5) lose money on fixed fees. | S | Med | Checkout validation | Blocks checkout if menu <500 cents; error toast. |
| Medium | Affiliate payout lock | Prevents self-referral fraud; builds trust. | M | Med | Stripe Connect, Firestore | 30-day hold; voids if referrer=referee. |
| Low | Payout UI sync with Stripe | UI promises options; code ignores, confuses merchants. | S | Low | Stripe API | Updates dashboard to reflect actual schedules. |

### Product/UX Upgrades (Mobile-First, Old-Device-Friendly)

**Decompose monolithic state into App Router pages for lazy loading.**
- Why: Reduces initial payload 50%+; faster on old Androids/iPhones with <2GB RAM.
- Effort: M
- Impact: High
- Dependencies: TypeScript refactor.
- Acceptance: Lighthouse score >90 on Moto G (2019) emulation.

**Add progressive loading states (skeletons) in discovery/menu.**
- Why: Handles weak networks; prevents blank screens on old devices.
- Effort: S
- Impact: Med
- Dependencies: Tailwind animations.
- Acceptance: Content appears <2s on throttled 3G.

**High-contrast mode toggle.**
- Why: Supports accessibility themes; aids old-device users in sunlight.
- Effort: S
- Impact: Med
- Dependencies: Tailwind variants.
- Acceptance: Passes WCAG AA; user pref persists via localStorage.

**Vehicle details as optional post-pay.**
- Why: Reduces pre-pay friction; old devices struggle with inputs.
- Effort: S
- Impact: High
- Dependencies: Firestore update.
- Acceptance: 20%+ conversion lift in tests.

### GPS/Discovery and Checkout/Payment Trust Flow Improvements

**Deferred GPS prompt with suburb prefill.**
- Why: Immediate prompt bounces users; suburb fallback ensures inclusion.
- Effort: S
- Impact: High
- Dependencies: Reverse geocoding API.
- Acceptance: 90% discovery completion; auto-fills if permitted.

**Movement-based auto-arrival with override.**
- Why: Prevents false arrivals; manual button handles VPN/GPS spoof.
- Effort: M
- Impact: High
- Dependencies: Threshold constants.
- Acceptance: Triggers at <50m; button logs overrides.

**Transparent fee split display in checkout.**
- Why: Builds trust; shows "$1 to cafe for curbside run."
- Effort: S
- Impact: Med
- Dependencies: Stripe session data.
- Acceptance: Line items match economics; no disputes in pilots.

**Apple/Google Pay priority.**
- Why: Skips card entry; 40% faster on mobile.
- Effort: S
- Impact: High
- Dependencies: Stripe Elements.
- Acceptance: Default option; processes in <10s.

### Security + Abuse Prevention Hardening Roadmap

**Upstash for global rate limits.**
- Why: Protects Twilio/Stripe from bots; in-memory ineffective.
- Effort: S
- Impact: High
- Dependencies: Vercel KV.
- Acceptance: Rejects >5/min; alerts on spikes.

**Firebase rules for write limits.**
- Why: Prevents order spam; current open to abuse.
- Effort: M
- Impact: High
- Dependencies: Firestore schema.
- Acceptance: Blocks >3 orders/user/hour; logs denials.

**Stripe Radar integration.**
- Why: Flags card testing; auto-blocks high-risk.
- Effort: S
- Impact: Med
- Dependencies: Stripe dashboard.
- Acceptance: <1% fraud rate in logs.

**Business verification workflow.**
- Why: Stops fake cafes; requires ABN upload.
- Effort: M
- Impact: High
- Dependencies: Admin approval.
- Acceptance: Manual review <24h; rejects invalid.

### Legal Policy Rewrite Quality Control (AU-First)

**Terms of Use: Add "Platform acts as limited agent; no liability for goods."**
- Why: Shields from ACL claims; clarifies bridge role.
- Effort: S
- Impact: High
- Dependencies: Counsel review.
- Acceptance: Enforceable clauses; no ambiguity.

**Privacy Policy: "GPS data deleted 24h post-order."**
- Why: APP compliance; reduces data breach risk.
- Effort: S
- Impact: Med
- Dependencies: Firebase purge function.
- Acceptance: Matches code; counsel approves.

**Cafe Terms: "Cafe bears chargeback risk post-capture."**
- Why: Boundaries liability; aligns with economics.
- Effort: M
- Impact: High
- Dependencies: Stripe terms.
- Acceptance: Signed by pilots; reduces disputes.

**Acceptable Use: Ban spoofing/GPS manipulation.**
- Why: Prevents abuse; enforceable takedown.
- Effort: S
- Impact: Med
- Dependencies: SOPs.md.
- Acceptance: Includes response flow; integrated in UI.

> **Flag:** Current docs contradict code—UI implies payout control, but Stripe dictates; rewrite to "payouts per Stripe schedule."

### Unit Economics and Sustainability Stress Test

Base assumption: $6 AOV, $2 fee, $1 cafe bonus, 2 SMS/order ($0.10), Stripe $0.44, hosting $0.05/order at scale.

| Scenario | Orders/Month | Fee Split (Platform Net) | Costs/Order | Margin/Order | Break-Even | Sensitivity |
|----------|--------------|--------------------------|------------|--------------|------------|-------------|
| Conservative (Low Volume) | 500 | $0.46 | $0.59 (High fixed) | -$0.13 | N/A (Loss) | +10% SMS: -$0.23; Stress: Delay scale. |
| Base (Pilot Scale) | 5,000 | $0.46 | $0.54 | $0.46 (46%) | 1,000 orders | +20% AOV: +$0.20; Sustainable at 2k/mo. |
| Aggressive (National) | 50,000 | $0.46 | $0.49 (Bulk discounts) | $0.51 (51%) | Immediate | -5% Fee: $0.36; Push for $2.50 fee. |

### App-Store Path

**Recommendation: Capacitor wrapper—wrap Next.js for native shell.**
- Why: Retains web code; adds push (kills SMS); App Store trust without RN rebuild.
- Effort: M
- Impact: High
- Dependencies: Capacitor CLI.
- Acceptance: Submits to stores; push replaces 50% SMS.

Milestones: Week 1: Install Capacitor; Week 4: Test push; Week 8: Submit (privacy disclosures match policy).

Decision tree: If push critical: Wrapper. If full native needed (offline): RN/Expo (but delay 3mo).

### Operations Automation Model (Founder-Light)

**Vercel + Firebase alerts to Slack.**
- Why: Monitors without daily checks; low overhead.
- Effort: S
- Impact: Med
- Dependencies: Slack webhook.
- Acceptance: Alerts on >$10 Twilio/day or >2 errors.

**Auto-purge + cron sweeps.**
- Why: Handles stale data/orders; no manual review.
- Effort: M
- Impact: High
- Dependencies: Vercel Cron.
- Acceptance: Daily run; logs completions.

**Hire VA at 50 cafes.**
- Why: Automate until support >1h/day.
- Effort: L
- Impact: Med
- Dependencies: KPI gates.
- Acceptance: VA handles disputes; founder <2h/week.

Model: Daily: Auto-alerts only. Weekly: Review Stripe dashboard. Manual: Fraud incidents.
