# Pull Up Coffee — Revenue Model Deep Think
## Prepared for Gemini Deep Research / Deep Think Analysis

> **Objective:** Find the optimal pricing/revenue model that (1) keeps cafes excited about extra revenue, (2) keeps customers feeling no hidden rip-off, (3) is sustainable from day one through massive scale, and (4) actually becomes profitable for the founder.

---

## 1. WHAT PULL UP COFFEE IS (Context)

Pull Up Coffee is a **curbside coffee ordering platform** — a marketplace bridge between cafes and drive-up customers. Think UberEats economics but for drive-through/curbside pickup only. No delivery drivers. The cafe brings the order to the customer's car.

**The unique value proposition:** Customers order ahead, pull up curbside, and get coffee brought to their car window. Cafes earn extra revenue through a "Curbside Runner Fee" that goes on top of their normal menu prices.

**Platform bridge model:** Pull Up Coffee never touches food, never handles logistics, never hires drivers. It's purely a digital ordering bridge with payment processing through Stripe.

---

## 2. THE CURRENT REVENUE MODEL (live in production code)

> **UPDATE (June 2025):** After deep analysis of all seven pricing models (Sections 5–7), **Model F — $0.99 Flat Service Fee** was selected and implemented across the entire codebase. The old 80/20 split model is retired.

### How money flows today:
```
Customer pays at checkout:
  = Menu items (cafe's normal prices)
  + Curbside Fee ($0.00 – $25.00, set by cafe — email for higher)
  + Pull Up Service Fee ($0.99 flat, every order)
  ──────────────────────────────────────────────────────
  Total displayed at checkout = all of the above combined

After Stripe processes payment:
  → Cafe receives: 100% of menu prices + 100% of curbside fee
  → Platform receives: $0.99 flat service fee per order
  → Stripe takes: 1.75% of total + $0.30 flat (absorbed by cafe)
```

### Revenue examples (at various curbside fees):
| Customer Order | Menu Items | Curbside Fee | Service Fee | Customer Pays | Cafe Gets (pre-Stripe) | Platform Gets | Stripe Takes |
|---|---|---|---|---|---|---|---|
| Small coffee | $4.50 | $2.00 | $0.99 | $7.49 | $6.50 | $0.99 | ~$0.43 |
| 2x coffees | $9.00 | $2.00 | $0.99 | $11.99 | $11.00 | $0.99 | ~$0.51 |
| Large order (4 items) | $22.00 | $3.00 | $0.99 | $25.99 | $25.00 | $0.99 | ~$0.75 |
| Family order | $45.00 | $4.00 | $0.99 | $49.99 | $49.00 | $0.99 | ~$1.18 |
| No curbside fee | $5.00 | $0.00 | $0.99 | $5.99 | $5.00 | $0.99 | ~$0.40 |

### Early Adopter Program (first 100 cafes):
- All cafes: keep 100% of menu prices + 100% of curbside fee (no platform take on either)
- Early adopters: After their affiliate's 30-day commission window ends, the cafe receives a **$0.25/order rebate** for the remaining 11 months
- After 100 cafes: Standard model — only affiliate 30-day bonus, no 11-month rebate

### Platform economics per order:
```
Platform fee:                    $0.99
MINUS SMS cost (2 × $0.0515):  -$0.103
─────────────────────────────────────
Net per order:                   $0.887

With affiliate (25% of $0.99 for 30 days):
  Platform fee:                  $0.99
  MINUS affiliate commission:   -$0.2475
  MINUS SMS cost:               -$0.103
  ─────────────────────────────────────
  Net per order (first 30 days): $0.6395

With early adopter rebate (months 2-12):
  Platform fee:                  $0.99
  MINUS early adopter rebate:   -$0.25
  MINUS SMS cost:               -$0.103
  ─────────────────────────────────────
  Net per order:                 $0.637
```

---

## 3. THE FOUNDER'S PRIORITIES (verbatim concerns)

1. **Cafe happiness:** "I want the cafes to make money, get them excited about the extra revenue from the curbside fee while keeping their normal menu item margins."

2. **Customer perception:** "I really like the idea of hiding — or at least giving the customer the idea that they're not getting an extra transaction fee. A lot of people get annoyed when they tap their card and then the total was $60 but their bank statement shows $60.61."

3. **Transparency:** "Keep things really transparent. The cafe should be super happy. Make it look super appealing and awesome for them."

4. **Sustainability:** "It needs to be a sustainable business. I can't be going backwards. I need a plan for the future."

5. **Profitability:** "I put a lot of time, effort into it. It needs to be sustainable and then actually get big and profitable for me ultimately."

6. **Simplicity for cafes:** "The $1 flat fee makes more sense but the only thing is it might be a bit more confusing for the cafe to understand — 'oh, the curbside fee is $2 minimum, and you're taking a 50% cut of that, so then they're only really making a dollar on that order.'"

7. **Menu price integrity:** "I really need to encourage cafes not to feel tempted to charge more for their normal items." (Wants to prominently show this in the partner login/dashboard)

---

## 4. ALL CURRENT MONTHLY EXPENSES (as of March 2026)

### Fixed Costs (Monthly):
| Service | Plan | Monthly Cost | Notes |
|---|---|---|---|
| **Vercel** | Hobby (Free) | $0.00 | Hosting, edge functions, CI/CD. **Scales to Pro at $20/mo** if >100GB bandwidth or need team features |
| **Firebase** | Spark (Free) | $0.00 | Firestore, Auth, hosting. **Scales to Blaze ~$25+/mo** when exceeding 50K reads/day or 20K writes/day |
| **Resend** | Free Tier | $0.00 | 100 emails/day, 3000/month. **Scales to Pro at $20/mo** for 50K emails |
| **Google Workspace** | Business Starter | $8.40 | hello@pullupcoffee.com business email |
| **Domain** | pullupcoffee.com | $2.50 | ~$30/year ÷ 12 |
| **Twilio Phone Number** | Active Number | $6.50 | Monthly cost to keep the AU phone number active for SMS |
| **TOTAL FIXED** | | **$17.40/mo** | |

### Variable Costs (Per-Transaction):
| Service | Cost | Notes |
|---|---|---|
| **Twilio SMS** | $0.0515/message (AU) | ~2 messages per order (notification + ready). Could reach 3-4 for delays/updates. International rates vary. |
| **Stripe Processing** | 1.75% + $0.30/txn (AU) | Currently passed through to customer (transparent line item). US: 2.9%+$0.30. UK: 1.4%+£0.20 |
| **Firebase reads/writes** | $0.00 (Spark) | Free until daily limits hit. Blaze: $0.06/100K reads, $0.18/100K writes |

### Scaling Cost Projections:
| Scale | Orders/Month | SMS/Order | Est. Monthly Cost | Key Triggers |
|---|---|---|---|---|
| **Pilot** (0-500 orders) | 500 | 2 | ~$69 | $17.40 fixed + $51.50 Twilio ($0.103/order × 500) |
| **Growth** (500-2000) | 2,000 | 2 | ~$224 | $17.40 fixed + $206 Twilio + Firebase may hit Spark limits |
| **Traction** (2000-5000) | 5,000 | 2.5 | ~$727 | $20 Vercel Pro + $25 Firebase Blaze + $6.50 Twilio number + $644 Twilio SMS ($0.0515 × 2.5 × 5000) + $20 Resend Pro |
| **Scale** (5K-20K) | 20,000 | 2.5 | ~$2,646 | Same platforms + $2,575 Twilio SMS. Twilio is still #1 cost |
| **National** (20K-50K) | 50,000 | 2.5 | ~$6,509 | Volume Twilio discounts may apply. Push notifications via app wrapper kills SMS costs |

### Critical Insight — Twilio is Still the Largest Variable Cost:
At 2 SMS per order × $0.0515 = **$0.103/order for SMS**. If platform revenue is only $0.40/order, SMS eats 25.75% of gross margin. At 3-4 SMS/order ($0.155–$0.206), SMS eats 39-52% of gross margin.

**Important:** The $0.0515/SMS rate is for Australian domestic SMS. When expanding internationally, rates vary:
- US: ~$0.0079/SMS (much cheaper)
- UK: ~$0.0420/SMS
- NZ: ~$0.0620/SMS
- CA: ~$0.0075/SMS

Plus the $6.50/month to keep each phone number active (need one per country).

**Mitigation path:** Capacitor app wrapper → push notifications → eliminates ~80% of SMS costs. Estimated timeline: 2-3 months post-launch. This is the single biggest lever for profitability.

**Second mitigation:** SMS batching — combine "order received" and "order ready" into fewer messages where possible.

---

## 5. PRICING MODEL OPTIONS TO EVALUATE

### Model A: Current Model — 20% of Curbside Fee
```
Platform revenue = Curbside fee × 20%
At $2 fee: $0.40/order
At $4 fee: $0.80/order  
At $6 fee: $1.20/order
```
**Pros:** Simple split. Cafe sees "$2 fee, I keep $1.60." Scales with fee.
**Cons:** At $2 fee, only $0.40 gross → $0.20 net after SMS. Unprofitable below ~1000 orders/mo. Cafe might resent "they take 20% of MY curbside fee."

### Model B: $1.00 Fixed Platform Fee (Blueprint Model)
```
Platform revenue = $1.00 flat per order regardless of order size
Formula: Total = Math.ceil((Menu + CafeFee + $1.00 + $0.30) / (1 - 0.0175))
Stripe processing is absorbed into the total, customer sees one clean number.
```
**Pros:** Predictable $1/order. Easy math. Blueprint already has this formula coded. Scales linearly.
**Cons:** Founder's concern: "At $2 fee, I'm taking 50% of the curbside fee — cafe only keeps $1." Makes the $2 minimum feel stingy. Customers might notice the fee bump. On large orders ($60+), the Stripe % on the $1 is negligible, but on small orders the $0.30 Stripe fixed fee is a bigger proportion.

### Model C: Fixed $0.50 Micro-Fee (Ultra-Low)
```
Platform revenue = $0.50 per order
Cafe keeps more: at $2 fee, cafe keeps $1.50 instead of $1.00
```
**Pros:** Very cafe-friendly. Cafe pitch: "You keep $1.50 of every $2 fee!" Low customer impact.
**Cons:** Only $0.50 - $0.20 SMS = $0.30 net/order. Need ~40 orders/day just to cover basics. Doesn't scale profitably.

### Model D: Tiered Platform Fee (Usage-Based)
```
0-500 orders/month: $0.00 (free tier to onboard)
500-2000: $0.50/order
2000+: $1.00/order
```
**Pros:** Removes barrier for new cafes. Rewards growth. Platform grows with merchant success.
**Cons:** Complex to explain. Cafes may feel sandbagged when they "graduate" to paid tier. Revenue is $0 during the most capital-intensive growth phase.

### Model E: Monthly SaaS Subscription
```
Free for first 30 days, then $29/month flat for unlimited orders
```
**Pros:** Predictable SaaS revenue. Cafe pays fixed cost regardless of volume. Platform doesn't need to worry about per-order margins.
**Cons:** High barrier for small/new cafes. Competing with free alternatives. Doesn't scale revenue with order volume. Cafe paying $29/mo needs to process ~15 orders/day just to justify the cost.

### Model F: Hybrid — Cafe Keeps 100% of Fee + Flat Service Charge to Customer ✅ SELECTED
```
Cafe fee: $0–$25 → goes 100% to cafe  
Platform fee: $0.99 "Pull Up Service Fee" added to customer's total  
Stripe processing: absorbed by cafe (~1.75% + $0.30)
```
**Pros:** Cafe pitch is incredible: "You keep 100% of the curbside fee — every cent." Zero conflict with cafe. Customer sees a clear "$0.99 service fee" line item they can understand. Predictable $0.99/order revenue scales linearly.
**Cons:** Adds another visible line item — customer sees: Menu + Curbside Fee + Service Fee — but at $0.99 it's under a dollar and most customers won't bat an eye. On a $4.50 coffee with $2 fee, customer pays ~$7.49 vs ~$6.50 without the platform fee.

### Model G: Embedded Fee (Invisible Platform Fee)
```
The platform fee is mathematically baked into the curbside fee minimum.
Minimum curbside fee = $3.00 (up from $2.00)
Cafe gets first $2.00, platform gets the extra $1.00
Customer just sees "Curbside Runner Fee: $3.00" — clean, one line item
```
**Pros:** One clean line item. Customer doesn't see "platform fee" at all. Cafe sets fee from $3-$6 and keeps (fee - $1). At $3: cafe gets $2, platform gets $1. At $5: cafe gets $4, platform gets $1.
**Cons:** Raising minimum from $2 to $3 might deter price-sensitive customers. Cafe pitch is "you keep (fee minus $1)" which is slightly less clean than "you keep 80%."

---

## 6. INITIAL QUESTIONS (see Section 16 for comprehensive expanded list)

> The full list of 15 analysis questions for Gemini is in **Section 15** below, after all the contextual data has been presented.

---

## 7. THE FOUNDER'S PRICING JOURNEY (What was tried → What changed → What's needed)

### Phase 1 — Original Blueprint Thinking ($1 Flat Fee):
The founder's original blueprint (PULLUP-MASTER-BLUEPRINT.md) designed a $1.00 flat platform fee per order:
```
Formula: Total = Math.ceil((Menu + CafeFee + $1.00 Target + $0.30 Stripe Fixed) / (1 - 0.0175 Stripe%))
Result: Customer pays the exact overhead. Stripe takes its cut. Cafe gets 100% of Menu + Bonus. Pull Up nets exactly $1.00.
```
**Why it seemed right:** Predictable, simple, scales linearly. At 5,000 orders/month = $5,000 revenue. Blueprint calculated $0.90 profit per order after SMS.

**Why the founder moved away from it:** "At $2 fee, I'm taking 50% of the curbside fee — cafe only keeps $1. That's a hard sell. The cafe's going to think 'you're taking half my fee?'"

### Phase 2 — Current Production Model (20% Split):
Switched to a percentage-based system where the platform takes 20% of the curbside fee:
```
Cafe gets: 100% menu prices + 80% of curbside fee
Platform gets: 20% of curbside fee
At $2 min fee: Platform gets $0.40/order
```
**Why it feels better for cafe optics:** "You keep 80% of your curbside fee" sounds generous. Cafe hears "80%" and thinks that's great.

**Why the founder is now concerned:** $0.40/order is thin. After $0.103 SMS (2 messages), that's $0.297 net. And when the founder does the maths on scaling costs, hosting upgrades, and future staff — $0.297/order doesn't feel sustainable long-term.

### Phase 3 — What Gemini Needs to Resolve:
The founder needs Gemini to recommend the **optimal model** considering:
1. What plays best with **cafe psychology** — the cafe needs to feel like Pull Up is pure upside, not a cost
2. What plays best with **customer psychology** — the customer needs to feel the total price is fair, not "rinsed"
3. What actually builds a **sustainable, profitable business** for the founder
4. What scales cleanly from 10 orders/month to 100,000 orders/month without needing model changes

---

## 8. AFFILIATE PROGRAM (Full Details — Live in Production)

### How It Works:
- Anyone can apply to become an affiliate through the public-facing website
- Application form collects: name, email, phone, country, social channels, preferred referral code
- Approved affiliates get a unique referral code (e.g., PULLUP-YOURNAME)
- Affiliates have their own dashboard to track referrals and earnings

### Commission Structure (currently coded):
```
Commission = 25% of the PLATFORM FEE for the first 30 calendar days of every cafe referred
Window: Starts from cafe's first successful transaction, runs 30 calendar days
Payout: Monthly to affiliate's connected Stripe account, paid GROSS (no tax withheld)
```

### Commission Impact by Pricing Model:
| Model | Platform Fee/Order | Affiliate Gets (25%) | Affiliate Attractiveness |
|---|---|---|---|
| ~~Current 20% split ($2 fee)~~ | ~~$0.40~~ | ~~$0.10/order~~ | ~~Low~~ |
| **$0.99 flat fee (SELECTED)** | **$0.99** | **~$0.25/order** | **Good — $75/month for a 10-order/day cafe** |
| $1.00 flat fee | $1.00 | $0.25/order | Medium — $75/month for a 10-order/day cafe |
| $0.50 micro-fee | $0.50 | $0.125/order | Very low — barely worth promoting |
| $1.50 flat fee | $1.50 | $0.375/order | Good — $112.50/month for a 10-order/day cafe |

### Affiliate Cost to Platform:
The affiliate commission comes OUT of the platform fee, not on top. This means:
- ~~At $0.40 platform fee: $0.10 goes to affiliate → only $0.30 left for platform → $0.197 after SMS → **very thin**~~
- **At $0.99 platform fee: ~$0.25 goes to affiliate → $0.74 left for platform → $0.637 after SMS → workable**
- At $1.00 platform fee: $0.25 goes to affiliate → $0.75 left for platform → $0.647 after SMS → workable
- Affiliate commissions only apply for 30 days per referred cafe, then stop

### Anti-Abuse Protection (already coded):
- ABN duplicate detection: if a cafe with the same ABN was previously approved, the referral is blocked (prevents re-signup bonus abuse)
- Automated referral codes tied to affiliate accounts
- Bot/spam protection on signup form

### Legal Compliance (already coded — region-aware):
- Affiliates are independent contractors (not employees)
- No tax withholding — all payments gross
- Mandatory disclosure requirements per region (AU: Consumer Law, US: FTC, UK: ASA, etc.)
- Anti-spam compliance required (AU: Spam Act 2003, US: CAN-SPAM, etc.)
- IP licensing for Pull Up logos/trademarks (limited, revocable)
- Full indemnification clause

---

## 9. EARLY ADOPTER PROGRAM (First 100 Cafes)

> **UPDATE (June 2025):** Early adopter limit increased from 33 to 100 cafes. Stripe cost absorption removed (Stripe fees now absorbed by cafe under the new model). Replaced with a **$0.25/order rebate for months 2–12** after the affiliate window ends.

### What Early Adopters Get (currently coded):
```javascript
EARLY_ADOPTER_CAFE_LIMIT = 100
EARLY_PARTNER_REBATE = 0.25  // $0.25/order for months 2–12
transactionCostModel: earlyAdopterEligible ? 'early-adopter-partner-bonus' : 'standard-service-fee'
platformServiceFee: 0.99
earlyPartnerRebate: 0.25
```

**Translation:** The first 100 cafe partners receive a $0.25/order rebate (passed back to the cafe) for 11 months after the affiliate's 30-day commission window closes. This is effectively the platform paying the cafe 25 cents per order as a loyalty bonus — making the effective platform take only $0.74/order during the early adopter period.

### What This Actually Costs the Platform:
On a typical order:
- Platform fee: $0.99
- Minus early adopter rebate: -$0.25
- Minus SMS: -$0.103
- **Net per order: $0.637** (vs $0.887 for standard cafes)

**At 100 cafes × 10 orders/day × $0.25 each = ~$250/day = ~$7,500/month** the platform pays out in early adopter rebates at full capacity.

### What Early Adopters See in Their Dashboard:
- Badge: "💰 This is Your Cream on Top"
- Messaging: "As an early adopter, you keep 100% of menu prices + 100% of your curbside fee — every cent."
- Revenue calculator showing their uplift percentage
- Early Partner bonus indicator showing $0.25/order rebate

### Live Spot Counter:
The signup page dynamically shows remaining spots:
> "X of 100 spots left for Early Adopter partner bonus"

### The "Dr Signed On" Context:
The founder has mentioned a "Dr" (doctor) who has signed on as one of the early adopter cafes. This is important because:
- A medical professional vouching for the platform adds credibility
- Demonstrates the platform appeals beyond just typical cafe owners
- This early adopter is one of the first real partners and their experience matters

### Important Note:
Under the new $0.99 flat fee model, the early adopter benefit is distinct and meaningful: cafes get paid $0.25 back per order for nearly a year. This is a clear, quantifiable benefit that makes early adoption tangibly rewarding without making the platform unprofitable.

---

## 10. CLEAN-CUT BILLING — THE CAFE CONFUSION PROBLEM

### The Founder's Core Fear:
> "I want it to be as clean cut for the cafes as well, so there's no queries about 'ah, Pull Up took too much. I thought it was gonna be this much, it was gonna be this much.' And I think that would happen if it does like a moving scale or a moving percentage, or if it's over this price it takes this price, etc."

### Why This Matters for Model Selection:
Models that create billing confusion (and should be AVOIDED or simplified):
- **Moving percentages** → "Why did Pull Up take $0.47 on one order and $0.82 on another?" → creates distrust
- **Tiered fees** → "Last month I paid nothing, now suddenly I'm paying $0.50/order?" → feels like bait-and-switch
- **Per-item fees** → "Why was the fee higher on the 4-item order?" → confusing
- **Percentage of total** → Different every single order → cafe can't predict their take-home

### Models that ARE clean-cut:
- **Fixed flat fee** → "Pull Up takes $1 per order. Always. Every time." → cafe knows exactly what to expect
- **Fixed % of curbside fee** → "Pull Up takes 20% of your curbside fee" → consistent, but the dollar amount varies with fee level
- **Visible service charge to customer** → cafe gets 100%, customer pays the platform fee → cafe has zero deductions

### What the Cafe Dashboard Currently Shows:
```
Menu Items:          $22.00
Curbside Fee:        $3.00 (100% yours)
Stripe % Cost:       -$0.43 at 1.75% (est.)
Extra Revenue:       +$2.57
Revenue Uplift:      11.7%
```
**Resolution:** With the $0.99 flat fee model, the cafe sees 100% of the curbside fee is theirs. No confusing "Cafe share: $2.40" — they see "$3.00 (100% yours)". The platform fee is a separate line charged to the customer, so the cafe never sees a deduction from their revenue.

---

## 11. THE STRIPE NEGOTIATION ANGLE

### Current Stripe Rates:
| Country | Rate | Per-Transaction Fixed |
|---|---|---|
| Australia | 1.75% | + $0.30 AUD |
| United States | 2.9% | + $0.30 USD |
| United Kingdom | 1.4% | + £0.20 |
| New Zealand | 2.7% | + $0.30 NZD |
| Canada | 2.9% | + $0.30 CAD |

### The Opportunity:
> Founder's insight: "I thought one of the benefits is taking all of that in [the Stripe fees] and then saying if you try to get a better deal with the payment processor then I don't need to disclose that to the cafes or customers or anything. And that's just my cream on top."

**How this works:**
1. Currently, the Stripe processing fee is passed through transparently to the customer as a line item
2. As Pull Up scales (>$100K/year in processing), Stripe offers volume discounts — potentially dropping from 1.75% to 1.5% or even 1.2%
3. If the customer-facing fee formula still uses 1.75%, the difference (0.25-0.55%) becomes pure platform profit
4. Neither cafes nor customers need to know the negotiated rate — they see "Payment Processing" as one fair line item
5. At 50,000 orders/month × $15 avg order × 0.25% spread = **$1,875/month in hidden margin**

### Stripe Volume Discount Tiers (approximate):
| Annual Volume | Typical Rate (AU) | Savings vs 1.75% |
|---|---|---|
| <$100K | 1.75% (standard) | — |
| $100K-$500K | ~1.5% (negotiated) | 0.25% |
| $500K-$1M | ~1.3% (negotiated) | 0.45% |
| $1M+ | ~1.1% (enterprise) | 0.65% |

### Why This Is a Long-Term Play:
This doesn't help at launch. But at scale, it's a significant revenue stream that requires ZERO changes to the cafe or customer experience. The formula already has the Stripe rate as a variable — when the rate drops, the spread is automatically captured.

**Question for Gemini:** Should the pass-through be kept transparent (current: shows exact Stripe fee as line item), or should it be wrapped into the curbside/service fee so the Stripe negotiation benefit is automatically captured without needing to update the formula? What's the legal/ethical position on this in each target market?

---

## 12. FUTURE COSTS THE FOUNDER HASN'T CONSIDERED

### Costs That WILL Hit as the Platform Scales:

| Cost | When It Hits | Monthly Estimate | Notes |
|---|---|---|---|
| **Vercel Pro** | >100GB bandwidth OR team features | $20/mo | Inevitable once traffic grows |
| **Firebase Blaze** | >50K reads/day OR >20K writes/day | $25-$100/mo | Scales with orders + analytics |
| **Resend Pro** | >100 emails/day | $20/mo | Signup notifications, receipts, affiliate emails |
| **Additional Twilio Numbers** | Expanding to US, UK, NZ, CA | $6.50/number/mo | Need one number per country (~$32.50 for 5 countries) |
| **Accounting Software** | Tax time / BAS returns | $30-$60/mo | Xero, MYOB, or QuickBooks |
| **Business Insurance** | Professional indemnity, public liability | $50-$150/mo | Required for AU business operation |
| **ABN / Business Registration** | Annual renewal | ~$5/mo | ASIC fees |
| **Lawyer / Legal Review** | Terms changes, disputes, IP issues | $200-$500/quarter | Ad-hoc but important |
| **Virtual Assistant** | >50 active cafes (support load) | $500-$1500/mo | Blueprint recommends at 50 cafes |
| **Marketing / Ads** | Customer acquisition at scale | $200-$2000/mo | Google Ads, Instagram, TikTok |
| **Capacitor App Submission** | Apple Developer ($149/yr AUD), Google Play ($35 one-time) | ~$15/mo amortized | Needed for push notification migration |
| **Push Notification Service** | After Capacitor app launch | $0-$25/mo | Firebase Cloud Messaging is free; OneSignal free tier |
| **Stripe Atlas / Incorporation** | US expansion | $500 one-time + $100/yr | If expanding to US market |
| **Customer Support Tool** | >100 active cafes | $25-$50/mo | Intercom, Crisp, or similar |
| **CDN / Asset Storage** | Media uploads, menu images | $5-$20/mo | Cloudinary, or Firebase Storage on Blaze |

### Costs People ALWAYS Forget:
1. **Chargebacks:** Stripe charges $25 per dispute. Even at 0.1% chargeback rate, 50K orders = 50 disputes = $1,250/month
2. **Refunds:** Platform still pays Stripe fee on refunded orders (Stripe keeps the processing fee)
3. **Failed payment retries:** Stripe charges for each attempt, even failed ones
4. **Currency conversion:** If accepting payments in multiple currencies, Stripe adds 1% on conversion
5. **Tax filing costs:** Accountant fees, GST/BAS lodgment, potentially US sales tax compliance
6. **Time cost:** Founder's time has value — even if not paying wages, opportunity cost is real
7. **Downtime/outages:** If Vercel or Firebase goes down, lost revenue + support burden
8. **Fraud:** Stolen card orders that get fulfilled before chargeback comes in

### Realistic Monthly Cost Projection at Scale:
| Stage | Orders/mo | Infrastructure | SMS | Staff/Support | Insurance/Legal | Marketing | TOTAL |
|---|---|---|---|---|---|---|---|
| **Launch** | 100-500 | $17.40 | $52 | $0 | $0 | $100 | ~$170 |
| **Traction** | 2,000-5,000 | $90 | $258-$644 | $0 | $100 | $500 | ~$950-$1,334 |
| **Growth** | 10,000-20,000 | $150 | $1,030-$2,060 | $750 | $150 | $1,000 | ~$3,080-$4,110 |
| **National** | 50,000+ | $250 | $5,150 | $2,000 | $200 | $2,000 | ~$9,600 |

---

## 13. AFFILIATE PROGRAM & EARLY ADOPTER ECONOMICS (Combined Impact)

### Worst Case Scenario ($0.99 Model + Affiliate + Early Adopter):
```
Order: $4.50 coffee + $2.00 curbside fee
Platform revenue: $0.99 flat
MINUS affiliate commission (25% of $0.99): -$0.2475
MINUS early adopter rebate ($0.25/order): -$0.25
MINUS SMS cost (2 messages): -$0.103
─────────────────────────────────────────
Net platform revenue per order: $0.3895
```
At 500 orders/month: **$194.75 net revenue** vs **$17.40 fixed costs** = $177.35 profit. **Viable even in worst case.**

Note: The affiliate and early adopter deductions don't stack for the same 30-day period. During the affiliate's 30-day window, only the affiliate commission applies. After that, the early adopter rebate kicks in for months 2–12. So the actual worst case is $0.6395/order (affiliate period) or $0.637/order (early adopter period), not both combined.

### Best Case Scenario ($0.99 Flat Fee, No Affiliate, No Early Adopter):
```
Order: $4.50 coffee + $2.00 curbside fee
Platform revenue: $0.99 flat
MINUS SMS cost (2 messages): -$0.103
─────────────────────────────────────────
Net platform revenue per order: $0.887
```
At 500 orders/month: **$443.50 net revenue** vs **$17.40 fixed costs** = $426.10 profit. **Healthy.**

### The Question Gemini Must Answer:
~~Is the $0.077/order worst-case scenario acceptable?~~ **RESOLVED.** The $0.99 model ensures minimum $0.3895/order even in the absolute theoretical worst case (affiliate + early adopter stacking), and typically $0.637+/order. This is 5–11× more profitable than the old 20% split model.

---

## 14. CUSTOMER & CAFE PSYCHOLOGY ANALYSIS (For Gemini)

### Customer Psychology:
1. **The "rinsed" threshold:** When does a customer look at their receipt and think "that's too many fees"? Research suggests 2 line items (product + delivery/service) is fine; 3+ line items (product + fee + processing + service) triggers fee fatigue
2. **The bank statement problem:** Founder specifically worries about customers seeing a different amount on their bank statement vs what they expected. Currently the Stripe processing is transparent (shown at checkout), which prevents surprise
3. **Price anchoring:** A $4.50 coffee becoming $7.03 at checkout is a 56% markup. At what point does the "convenience" stop feeling worth it?
4. **Competitor comparison:** UberEats charges 30% to cafes + service fee + delivery fee to customer = often 40-60% more than menu price. Pull Up's total markup (~25-35%) is much lower, but customers may not compare rationally

### Cafe Psychology:
1. **"Pure upside" framing:** The cafe needs to feel like every Pull Up order is FREE money they wouldn't have gotten otherwise. Any fee that feels like it's "taking from them" kills this
2. **The 80/20 split perception:** "You keep 80% of the curbside fee" sounds good. But when the cafe does the maths: "$2 fee, I keep $1.60, Pull Up takes $0.40" — they might think "$0.40 for what? I'm the one making the coffee and running it out to the car"
3. **Menu price inflation risk:** If cafes feel the platform is taking too much, they'll quietly raise menu prices to compensate — which hurts customer perception and kills the value prop. Founder wants to actively discourage this
4. **Dashboard framing matters:** The cafe dashboard revenue calculator currently shows "Revenue Uplift: X%" which frames Pull Up as additive. This is good psychology but needs to be consistent with whatever model is chosen
5. **The "clean-cut" need:** Cafe owners are busy. They don't want to do maths. They want to know: "I made X orders today, I'll get Y dollars." A fixed, predictable fee enables this. A percentage creates doubt on every settlement

### What the Founder Wants Gemini to Recommend:
> "I need to know what would play out best with people psychology — cafe psychology and all that. What makes the cafe excited and what makes the customer feel fair?"

---

## 15. KEY QUESTIONS FOR GEMINI TO ANALYZE

1. **Which model maximizes cafe sign-up conversion?** The cafe needs to see Pull Up Coffee as pure upside, not a cost center.

2. **Which model has the cleanest customer perception?** The founder specifically wants customers to NOT feel "rinsed" or see surprise charges on their bank statements.

3. **At what order volume does each model break even?** Factor in: $17.40 fixed costs, $0.103/order SMS (2 messages), potential Vercel/Firebase/Resend upgrades at scale, $6.50/mo Twilio number fee.

4. **What's the 12-month revenue projection for each model** assuming growth from 100 → 500 → 2000 → 5000 orders/month?

5. **How does the push-notification migration (eliminating SMS costs) change the math?** If SMS drops from $0.103/order to ~$0.01/order, which model becomes most profitable?

6. **Is there a hybrid approach** that combines the best of multiple models? E.g., starts with one model and evolves.

7. **What do competitor marketplaces charge?** UberEats (30% commission), DoorDash (15-30%), Square Online (2.6%+30¢), Toast (varies by plan). How should Pull Up position vs these? What about me&u, Mr Yum, Bopple (Australian competitors)?

8. **Should the Stripe processing fee stay transparent** (separate line item) or be absorbed into the curbside fee for cleaner UX? What's the psychological impact? Is there a legal requirement to show it separately in any target market?

9. **What's the optimal curbside fee range?** Currently $2-$6. Should the minimum go up to $3? Down to $1.50? What does consumer research say about fee sensitivity for convenience services?

10. **How should the cafe dashboard present the revenue split** to make cafes feel excited rather than like they're losing money? The founder wants this to be a key part of the partner login experience.

11. **Factor in affiliate commission costs** — at 25% of platform fee for 30 days, how does this affect viability in early months when most cafes are referred?

12. **Factor in early adopter Stripe absorption costs** — platform absorbs ~$0.12/order in Stripe fees for first 33 cafes. How long until this stops mattering?

13. **What about the Stripe negotiation angle?** As volume grows, negotiated rates drop. Should the pass-through formula be locked at 1.75% so future rate reductions become hidden platform margin? Is this ethical/legal?

14. **What future costs hasn't the founder considered?** (See Section 13) How should the model account for chargebacks, refunds, insurance, legal, VA/support staff, marketing?

15. **Menu price integrity:** How should the platform discourage cafes from inflating menu prices on Pull Up vs their in-store prices? What messaging/monitoring would work?

---

## 16. FOUNDER'S GOLDEN RULES (non-negotiable)

> **UPDATE (June 2025):** Rules updated to reflect the implemented $0.99 flat fee model.

1. ✅ Cafes keep 100% of menu item prices — ALWAYS
2. ✅ Cafes keep 100% of curbside fees — ALWAYS
3. ✅ No hidden fees — everything visible and explainable  
4. ✅ Platform revenue = $0.99 flat service fee per order, charged to the customer
5. ✅ Stripe processing cost is absorbed by the cafe (~1.75% + $0.30 on total)
6. ✅ Cafes set their own curbside fee within guardrails ($0–$25 range, email for higher)
7. ✅ The model must work at 100 orders/month AND 100,000 orders/month
8. ✅ Customers should never feel "rinsed" or see unexpected charges
9. ✅ Billing must be "clean-cut" for cafes — no confusing moving scales, no "it depends" explanations
10. ✅ The affiliate program must remain attractive enough to drive growth (25% of $0.99 = ~$0.25/order for 30 days)
11. ✅ Early adopter promises must be honored — first 100 cafes get $0.25/order rebate for months 2–12
12. ✅ The model should naturally discourage cafes from inflating menu prices

---

## 17. CURRENT CODE ARCHITECTURE (for context)

> **UPDATE (June 2025):** Fully reflects the implemented $0.99 flat service fee model (Model F).

### Where pricing logic lives:
- **Checkout route:** `app/api/stripe/checkout/route.ts` — validates curbside fee $0–$25, adds conditional "Curbside Fee" line item (only if > $0), adds flat "Pull Up Service Fee" ($0.99 / 99 cents) line item. Stripe pass-through REMOVED.
- **Fee constants:** `app/page.tsx` line 165 — `MIN_CURBSIDE_FEE = 0.0`, `MAX_CURBSIDE_FEE = 25.0`, `PLATFORM_SERVICE_FEE = 0.99`, `EARLY_ADOPTER_CAFE_LIMIT = 100`, `EARLY_PARTNER_REBATE = 0.25`
- **Revenue calculator:** `app/page.tsx` `calculateOrderEconomics()` — returns `menuRevenue`, `curbsideFeeValue`, `totalOrderValue`, `estimatedStripeFee`, `cafeNetRevenue`, `extraRevenue`, `upliftPct`
- **Transaction cost model:** stored per-cafe in Firestore: `transactionCostModel` field (`early-adopter-partner-bonus` or `standard-service-fee`)
- **Platform service fee:** stored per-cafe: `platformServiceFee: 0.99`, `earlyPartnerRebate: 0.25`
- **Affiliate commission:** 25% of $0.99 = ~$0.25/order, calculated and tracked in Firestore `affiliate_commissions` collection
- **Early adopter check:** `signupSequence <= EARLY_ADOPTER_CAFE_LIMIT` (100)
- **P.U.L.S.E. Command Centre:** `app/pulse/page.tsx` — admin dashboard tracks $0.99/order platform revenue, SMS costs at $0.103/order, break-even at ~1,691 orders/mo

### What the customer currently sees at checkout:
```
☕ Flat White (Large)                    $5.50
☕ Iced Latte                            $6.00
🚗 Curbside Fee                          $2.00
⚡ Pull Up Service Fee                   $0.99
─────────────────────────────────────────────
Total                                   $14.49
```

### What the cafe dashboard currently shows (per order):
```
Menu Items:          $11.50
Curbside Fee:        $2.00 (100% yours)
Stripe % Cost (est): -$0.25 at 1.75%
Extra Revenue:       +$1.75
Revenue Uplift:      15.2%
```

### What the cafe settings page tells them:
> "The curbside fee is charged to customers for curbside delivery convenience. Range: $0–$25 (email us for higher). You keep 100% of this fee — every cent."
> "Pull Up charges a flat $0.99 Pull Up Service Fee to each customer to cover platform operations (SMS notifications, hosting, support, development). This fee goes to Pull Up — your menu revenue and curbside fee are untouched."
> "What You Keep: 100% of your menu prices + 100% of your curbside fee. Pull Up only retains the $0.99 service fee (which is charged directly to the customer, not deducted from your earnings)."

---

## 18. FINAL DECISION — MODEL F SELECTED ($0.99 Flat Service Fee)

### Why Model F Was Chosen:
After evaluating all seven models (A through G) against cafe psychology, customer perception, sustainability, and scalability, **Model F — Hybrid Flat Service Charge** was selected for the following reasons:

1. **Cafe pitch is unbeatable:** "You keep 100% of your menu prices AND 100% of your curbside fee — every cent." No other model can make this claim.
2. **Customer clarity:** One clean "$0.99 Pull Up Service Fee" line item. Under a dollar. Most customers won't think twice.
3. **Predictable platform revenue:** $0.99/order, always. No variability based on order size or curbside fee level.
4. **Clean-cut billing:** Cafe never sees a deduction. The platform fee is separate from their revenue. Zero confusion.
5. **Affiliate attractiveness:** 25% of $0.99 = ~$0.25/order is meaningful. A cafe doing 10 orders/day earns the affiliate ~$75/month.
6. **Sustainable from day one:** $0.887 net/order (after SMS). Break-even at ~1,691 orders/month ($1,500 target). Achievable with ~17 active cafes averaging 3–4 orders/day each.

### Model Comparison Summary:
| Model | Platform $/order | Net after SMS | Break-even (orders/mo) | Cafe Perception |
|---|---|---|---|---|
| A: 20% split ($2 fee) | $0.40 | $0.297 | ~5,051 | "They take 20% of MY fee" |
| B: $1.00 flat | $1.00 | $0.897 | ~1,672 | "They take 50% of the $2 fee" |
| C: $0.50 micro | $0.50 | $0.397 | ~3,778 | Cafe-friendly but thin |
| D: Tiered | Variable | Variable | Complex | Confusing |
| E: SaaS $29/mo | $29/cafe/mo | Fixed | N/A | High barrier |
| **F: $0.99 service** | **$0.99** | **$0.887** | **~1,691** | **"I keep everything!"** ✅ |
| G: Embedded $1 | $1.00 | $0.897 | ~1,672 | "$3 min fee looks high" |

---

*This document contains all financial data, affiliate program details, early adopter commitments, cafe/customer psychology analysis, future cost projections, Stripe negotiation strategy, code architecture, and founder intent needed for a comprehensive pricing strategy analysis. Model F ($0.99 flat service fee) has been selected and fully implemented in production code.*
