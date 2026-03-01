# Pull Up Coffee — Going Live: Complete Walkthrough

> **Created:** February 28, 2026
> **Status:** Pre-launch checklist — follow in order

---

## PART 1: Printful — How It Works & Setup

### How Printful + Pull Up Coffee Connect

```
Customer buys hat on pullupcoffee.com ($45 AUD)
        ↓
Stripe collects $45 + $10 shipping from customer
        ↓
Stripe webhook fires → hits /api/stripe/webhook
        ↓
Webhook detects metadata.tier === 'hat'
        ↓
Calls createPrintfulOrder() with customer's shipping address
        ↓
Printful receives order via API
        ↓
Printful charges YOUR Printful wallet/card for base cost ($20.75 AUD)
        ↓
Printful prints, embroiders, and ships the hat
        ↓
Customer receives hat (3-7 business days)
        ↓
You keep the profit: $45 - $20.75 = $24.25 per hat
```

### Your Current Printful Status (verified via API just now)

| Item | Status |
|------|--------|
| API Token | Working (`5YA8...XuD`) |
| Product | "Dad hat" — Yupoong 6245CM (White), 1 variant |
| Variant ID | `5209305664` — matches env var |
| Retail Price | AU$45.00 |
| Printful Cost | AU$20.75 (your cost to produce) |
| Your Profit | AU$24.25 per hat |
| Shipping Cost | AU$5.95-$16.80 (Printful charges you, you charge customer $10 flat) |
| Orders endpoint | Working — 0 orders so far |
| Store name | "Pull Up Coffee" |

### CRITICAL: Printful Billing Setup (You Must Do This)

You're right that Printful needs a payment method loaded BEFORE orders can be fulfilled. Here's the deal:

**Printful does NOT take the customer's payment.** They charge YOU (the store owner) their base cost to manufacture + ship. You already collected the retail price from the customer via Stripe.

**Step-by-step (do this in Printful dashboard):**

1. Go to [printful.com/dashboard/billing](https://printful.com/dashboard/billing)
2. Click **"Billing methods"** or **"Add payment method"**
3. **Option A: Credit/Debit Card** (simplest)
   - Add your card → Printful charges per-order (e.g., $20.75 + shipping per hat)
   - No upfront cost — they charge when the order is placed
4. **Option B: Printful Wallet** (pre-load funds)
   - Go to **Billing → Wallet**
   - Add funds (e.g., $50-$100 AUD to start)
   - Orders deduct from wallet balance
   - Set up **auto-top-up** so it refills when balance gets low
   - This is faster for fulfillment because there's no payment authorization delay

**Recommended for you:** Start with **Option A (credit card)** since volume is low. Switch to wallet with auto-top-up once you're getting regular hat orders.

### Printful Order Approval Setting

In your Printful screenshot, I can see **Settings → Store settings → Orders**. There's an important setting here:

- Go to [printful.com/dashboard/settings/store-orders](https://printful.com/dashboard/settings/store-orders)
- Look for **"Order approval"** or **"Automatically submit orders for fulfillment"**
- **Enable auto-submit** — this means when our API creates an order, Printful immediately starts production
- If disabled, you'd have to manually approve each order in the Printful dashboard (not ideal)

### Testing Printful (Without Spending Money)

Printful has a "confirm" step — orders created via API start in "draft" status by default. To test:

1. Buy a hat on pullupcoffee.com using Stripe test card `4242 4242 4242 4242`
2. Check Vercel logs → you'll see "Printful order created"
3. Go to Printful dashboard → Orders → you'll see a draft order
4. Since it's from a test Stripe payment, you can just cancel/delete it in Printful

**Once you go live with Stripe:** Real payments will trigger real Printful orders that get auto-fulfilled.

---

## PART 2: Stripe — Switching to Live Mode

### Current Status
- You're in **Sandbox/Test mode** (orange "Sandbox" banner in your screenshots)
- 7 test payments processed ($4.50 to $79.00)
- 13 connected accounts (mostly test cafes)
- 1 uncaptured payment ($11.81) — that's the manual capture flow working correctly

### Step-by-Step: Going Live

#### Step 1: Complete Stripe Account Verification
1. Go to [dashboard.stripe.com/account](https://dashboard.stripe.com/account)
2. Click **"Switch to live account"** (top-right in your screenshot)
3. Stripe will ask you to verify:
   - **Business type:** Sole trader / Company
   - **Business details:** ABN 17 587 686 972, Pull Up Coffee Pty Ltd
   - **Business address**
   - **Bank account** for payouts (your everyday account BSB + account number)
   - **Identity verification** (driver's license or passport photo)
   - **Website URL:** pullupcoffee.com
4. Verification usually takes 1-2 business days

#### Step 2: Get Live API Keys
Once verified:
1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) (make sure you're NOT in test mode)
2. Copy:
   - **Publishable key:** starts with `pk_live_...`
   - **Secret key:** starts with `sk_live_...`

#### Step 3: Create Live Webhook
1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) (live mode)
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://pullupcoffee.com/api/stripe/webhook`
4. **Events to listen for:** `checkout.session.completed`
5. Copy the **Signing secret** (starts with `whsec_...`)

#### Step 4: Update Environment Variables
Update these in **Vercel** (not just .env.local):
1. Go to [vercel.com](https://vercel.com) → pullup-v2 → Settings → Environment Variables
2. Update these three values:

```
STRIPE_SECRET_KEY = sk_live_... (your new live secret key)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_... (your new live publishable key)
STRIPE_WEBHOOK_SECRET = whsec_... (your new live webhook secret)
```

3. **Redeploy** the project after updating env vars

#### Step 5: Test a Real Payment
1. Go to pullupcoffee.com
2. Sign up a test cafe (your mum's cafe)
3. Approve it in Firebase
4. Place a real order with a real card
5. Verify:
   - Payment appears in Stripe live dashboard
   - Order appears in Firebase
   - SMS sent to cafe
   - Email confirmation sent

### Important: Keep Test Mode for Development
- Your `.env.local` file can keep the test keys for local development
- Vercel production uses the live keys
- You can always switch back to test mode in Stripe dashboard to test new features

---

## PART 3: Real-World Test Plan (Mum's Cafe)

### The Test Flow

```
1. You (or brother) → Create affiliate account
   - Get referral code: PULLUP-[NAME]-XXXX
   
2. Mum → Signs up as cafe owner at pullupcoffee.com
   - Uses affiliate referral code during signup
   - Fills in real details (ABN, address, etc.)
   
3. You → Approve the cafe in Firebase Console
   - Edit document → isApproved: true
   - Mum gets approval email + SMS
   
4. Mum → Logs into her cafe dashboard
   - Sets up menu items
   - Connects Stripe (Payments tab → "Connect Stripe")
   - Goes "Online" in Operations tab
   
5. You → Drive to mum's house, park outside
   - Open pullupcoffee.com → Order Now
   - Find mum's cafe in Discovery
   - Order a coffee, enter car details
   - Pay with real card
   
6. Watch the magic:
   - Mum's dashboard shows the order with your car details
   - She accepts → you see status update
   - She marks "Making" → you see it
   - She marks "Ready" → you get notified
   - She marks "Complete" → order done
   
7. Check payments:
   - Stripe dashboard: payment captured
   - Mum's Stripe account: payout scheduled
   - Affiliate dashboard: commission recorded
```

### Mum's Stripe Connect Setup
When mum clicks "Connect Stripe" in her Pull Up dashboard:
1. She'll be redirected to Stripe Connect onboarding
2. She enters HER bank details (where she wants to be paid)
3. Stripe verifies her identity
4. Once connected, payments flow: Customer → Stripe → Mum's bank (minus platform fee)

---

## PART 4: Duplicate Email Issue

Your Gmail screenshot shows 3-4 approval emails. This happened because:
- The simulation ran 3-4 times (each run creates a new cafe and sends approval)
- Each run sent a real email to stevenbrianweir@gmail.com

**This is NOT a bug in production.** In real usage, each cafe gets approved once = one email. The duplicates are from repeated simulation runs.

To clean up, I've already run `cleanup.mjs` which removes test data. You can delete those emails from Gmail.

---

## PART 5: Twilio — Your SMS Costs

From your billing screenshot:
- **Available funds:** $12.83
- **February spend:** $8.32
- **Billing type:** Pay-as-you-go with auto-recharge enabled
- **Cost per SMS:** ~$0.05 per segment (short message) or ~$0.10 per 2-segment message

All 7 messages show **"Delivered"** status. Your Twilio account is healthy.

**Tip:** Set a low-balance alert at $5.00 so you don't run out:
1. Twilio Console → Billing → Triggers
2. Add trigger: "Send email when balance drops below $5.00"

---

## PART 6: Video Creation Tools

### Best Free/Cheap Tools for Walkthrough Videos

| Tool | Best For | Cost | Link |
|------|----------|------|------|
| **Loom** | Screen recording + face cam + narration | Free (25 videos), Pro $12.50/mo | [loom.com](https://loom.com) |
| **OBS Studio** | Professional screen recording (no watermark) | Free | [obsproject.com](https://obsproject.com) |
| **CapCut** | Editing videos with text/effects/music | Free | [capcut.com](https://capcut.com) |
| **Canva** | Quick video editing + thumbnails + intros | Free tier available | [canva.com](https://canva.com) |
| **DaVinci Resolve** | Professional editing (Hollywood-level, free) | Free | [blackmagicdesign.com](https://blackmagicdesign.com/products/davinciresolve) |

### Recommended Workflow (Cheapest)
1. **Record** with OBS Studio (free, no watermark, unlimited)
2. **Edit** with CapCut (free, easy, has templates)
3. **Thumbnails** with Canva (free tier)
4. **Host** on YouTube (free, unlisted or public)
5. **Embed** on your site or link from emails

### Videos to Create (3 total)

1. **Customer Video** (~2-3 min) — Script ready at `docs/Video-Walkthrough-Customer.md`
   - "How to order coffee with Pull Up"
   - Show: Landing page → Discovery → Menu → Checkout → Tracking

2. **Business Owner Video** (~4-5 min) — Script ready at `docs/Video-Walkthrough-Business.md`
   - "How to set up your cafe on Pull Up Coffee"
   - Show: Signup → Approval → Dashboard tour → Accepting orders → Getting paid

3. **Affiliate Video** (~1-2 min) — Quick and simple
   - "Earn 25% commission referring cafes to Pull Up"
   - Show: Footer → Affiliate tab → Sign up form → Get code → Share → Dashboard

### Recording Tips
- Use your phone for the customer video (shows mobile experience)
- Use your laptop for the business/affiliate videos (dashboard is better on desktop)
- Natural lighting, speak clearly, keep it casual
- Add captions (CapCut does this automatically with AI)

---
