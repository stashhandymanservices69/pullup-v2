# Pull Up Coffee — Business Registration, Accounting & Launch Budget

> **Created:** February 28, 2026 (Saturday)  
> **Target Launch:** Monday, March 2, 2026  
> **Not legal or tax advice — consult an accountant for formal guidance**

---

## PART 1: Registering as a Company ($39 ASIC)

### What You're Doing
You already have ABN **17 587 686 972** (sole trader). Registering as a **Pty Ltd company** via ASIC:
- Creates a separate legal entity (protects your personal assets)
- Looks more professional to cafes and partners
- Required for scaling (investors, contracts, hiring)
- Cost: **$39** (ASIC annual review fee — currently waived for first year if registering via business.gov.au)

### Step-by-Step

1. **Go to:** [asic.gov.au/for-business/registering-a-company](https://asic.gov.au/for-business/registering-a-company/)
   - Or via [business.gov.au](https://business.gov.au) → "Register a company"

2. **Company Name:** `Pull Up Coffee Pty Ltd`
   - Check availability first: [asic.gov.au/online-services/search/](https://connectonline.asic.gov.au/RegistrySearch/)
   - Your website already says "© 2026 Pull Up Coffee Pty Ltd" so this name should be reserved

3. **Company Details:**
   - **Type:** Proprietary company limited by shares (Pty Ltd)
   - **Registered office:** Your home address (can be changed later)
   - **Principal place of business:** Same as above
   - **Director:** Steven Weir (you)
   - **Shareholder:** Steven Weir — 100 ordinary shares at $1 each
   - **Company secretary:** Optional for Pty Ltd (leave yourself)

4. **After Registration:**
   - You'll get a new **ACN** (Australian Company Number) — 9 digits
   - Your existing **ABN** stays the same BUT gets linked to the new entity
   - Update your ABN registration at [abr.business.gov.au](https://abr.business.gov.au) to show the company as the holder
   - Update your website footer: `© 2026 Pull Up Coffee Pty Ltd. ACN: [your new ACN]. ABN: 17 587 686 972`

5. **Annual Obligations:**
   - **ASIC annual review:** $310/year (due 2 months after each anniversary)
   - **Company tax return:** Lodge with ATO annually (can use an accountant or do via myGov)
   - **Company tax rate:** 25% for base rate entities (turnover under $50M)

---

## PART 2: GST Registration

### Do You Need to Register for GST?
- **Mandatory** when turnover exceeds **$75,000/year**
- **Voluntary** registration available anytime (might be worth it to claim GST credits on expenses)

### Recommendation: Register Voluntarily NOW
Why:
- You can claim GST credits on Twilio bills, domain costs, Printful orders, marketing spend
- Looks more professional on invoices
- Must do it eventually anyway
- If you DON'T register and accidentally cross $75k, ATO can backdate the obligation

**How:**
1. Go to [ato.gov.au](https://ato.gov.au) → Log in via myGov
2. ABR → "Register for GST"
3. Choose **monthly or quarterly BAS** (quarterly is easier if revenue is low)
4. GST applies from the date you register

### GST on Your Revenue
- Coffee orders: Customer pays $X → you collect platform fee ($0.40/order) → GST = 1/11th of $0.40 = ~$0.036
- Hat sales: Customer pays $45 → GST = $4.09
- Curbside fee: $2.00 → GST = $0.18
- **You charge GST-inclusive prices** (the price shown to customers already includes GST)
- You remit GST to ATO on your BAS

---

## PART 3: Accounting Setup (Practical)

### Recommended Tool: **Xero** ($29/mo Starter Plan)
Why Xero over alternatives:
- Best Stripe integration in Australia (auto-imports all transactions)
- Bank feed support for all major AU banks
- BAS lodgement built-in (no manual ATO portal work)
- Cheapest plan ($29/mo) handles everything you need
- Your future accountant will almost certainly use Xero

### Setup Checklist (1 Hour)

1. **Sign up:** [xero.com.au](https://www.xero.com.au/) — 30-day free trial, then $29/mo
2. **Business details:** Enter ABN, company name, address
3. **Connect bank account:** Settings → Bank Accounts → Add your everyday account
4. **Connect Stripe:** Apps → Stripe → Authorize → auto-imports all payments, fees, payouts
5. **Chart of accounts** (Xero has defaults, add these custom ones):

| Account | Type | For |
|---------|------|-----|
| Platform Fee Income | Revenue | The $0.40 per order you keep |
| Curbside Fee Income | Revenue | The $1.60 paid to cafes (pass-through, but track it) |
| Merch Sales | Revenue | Hat sales ($45/hat) |
| Donation Income | Revenue | Coffee/Supporter/VIP donations |
| Affiliate Commissions | Expense | 25% commission paid to affiliates ($0.10/order) |
| Stripe Processing Fees | Expense | 1.75% + 30c per transaction |
| Twilio SMS Costs | Expense | ~$0.05-0.10 per SMS |
| Resend Email Costs | Expense | Free tier for now |
| Printful COGS | Cost of Goods Sold | $20.75 + shipping per hat |
| Domain & Hosting | Expense | Domain renewals |
| Software Subscriptions | Expense | Xero, any other tools |
| Marketing & Advertising | Expense | Flyers, cards, social ads |
| ASIC Fees | Expense | Annual company review |

6. **GST settings:** Settings → Financial Settings → Enable GST → Tax: BAS Excluded by default, then set each account
7. **Invoice template:** Customize with Pull Up Coffee logo, ABN, payment terms

### Weekly Routine (15 min)
1. Open Xero → Bank Reconciliation
2. Match Stripe payouts to bank deposits
3. Categorize any other expenses (Twilio top-up, domain renewal, etc.)
4. Done

### BAS Lodgement (Quarterly, 30 min)
1. Xero auto-calculates GST collected vs GST credits
2. Review the BAS report in Xero
3. Lodge directly through Xero (or export and lodge via myGov)
4. Pay any GST owing to ATO

### Finding an Accountant ($500-1,500/year for small business)
- **TaxFox** or **Hnry** — cheap online accountants for small business ($50-100/mo)
- **Local accountant** — ask for a "startup package" or "sole trader to company transition"
- **What to ask:** "Can you review my Xero setup and confirm GST treatment for a marketplace platform?"
- **When:** Before your first BAS is due (if you register now, first BAS = April-June quarter, due July 28)

---

## PART 4: Money Spent So Far (Estimated)

### Platform Development Costs

| Item | Cost (AUD) | Status | Notes |
|------|-----------|--------|-------|
| **Domains** | | | |
| pullupcoffee.com (Squarespace) | ~$25-40/yr | Active | Annual renewal |
| pullupcoffee.com.au (Squarespace) | ~$40-55/yr | Active | AU domain |
| **Hosting** | | | |
| Vercel (Hobby plan) | $0 | Free | Free tier |
| **Database** | | | |
| Firebase (Spark plan) | $0 | Free | Free tier (generous limits) |
| **Payments** | | | |
| Stripe | $0 | Free | No monthly fee, just per-transaction |
| **SMS** | | | |
| Twilio phone number (+61...) | ~$2/mo | Active | AU number lease |
| Twilio SMS credits loaded | ~$21 | Spent | $12.83 remaining balance |
| Twilio SMS sent (Feb) | ~$8.32 | Used | Test + simulation messages |
| **Email** | | | |
| Resend | $0 | Free | Free tier (100 emails/day) |
| **Merch** | | | |
| Printful | $0 | Free | No fees until orders placed |
| **AI / Development** | | | |
| Claude / Copilot subscription | ~$20-30/mo | Active | Your coding assistant |
| **Legal** | | | |
| ASIC Company Registration | $39 | Pending | About to do |
| Trade Mark (if filed) | $250-400 | Future | Per class, via IP Australia |

### Estimated Total Spent to Date

| Category | Amount |
|----------|--------|
| Domains (est. 2 domains, 1 year) | ~$80 |
| Twilio (number + credits) | ~$23 |
| AI tools (est. 1-2 months) | ~$40-60 |
| ASIC registration | $39 |
| **TOTAL ESTIMATED** | **~$182-$202** |

> That's incredibly lean for a full production platform. Most startups spend $5,000-$50,000 to get to this point.

---

## PART 5: Projected Costs — Next 30 Days

### Fixed Monthly Costs (Ongoing)

| Item | Monthly | Notes |
|------|---------|-------|
| Twilio phone number | $2 | AU number lease |
| Twilio SMS (est. 50 messages) | $5 | Operational SMS |
| Xero accounting | $29 | After 30-day free trial |
| Domains (amortized) | $7 | ~$80/yr ÷ 12 |
| Claude/Copilot | $20-30 | Development |
| **Monthly fixed** | **~$63-73** | |

### Variable Costs (Per Transaction)

| Item | Per Event | Notes |
|------|-----------|-------|
| Stripe fee (per order) | 1.75% + $0.30 | Charged on total order amount |
| Twilio SMS (per message) | $0.05-0.10 | Order notifications, OTP codes |
| Printful hat (per order) | $20.75 + $5.95 shipping | Only when hat sold |
| Affiliate commission | $0.10 per order | 25% of platform fee, first 30 days |

### Launch Week Budget (This Weekend → Monday)

| Item | Cost | Priority |
|------|------|----------|
| **Business cards** (100 pack, Vistaprint/Canva Print) | $30-50 | High |
| **QR code flyers/posters** (20 A4, Officeworks) | $10-20 | High |
| **Cafe door hanger** (for first partners) | $0 (design yourself, print at Officeworks) | Medium |
| **Instagram/Facebook boost** (local area) | $50-100 | High |
| **Google Business Profile** setup | $0 | High |
| **ASIC company registration** | $39 | High |
| **Twilio top-up** (more SMS credits) | $20 | Medium |
| **Xero subscription** | $0 (30-day trial) | High |
| **Coffee for first cafe visits** | $20 | Nice touch |
| **TOTAL LAUNCH WEEK** | **~$169-$249** | |

---

## PART 6: Monday Launch Day Plan

### Saturday (Today) — Setup

- [ ] Register company at ASIC ($39)
- [ ] Add payment method in Printful ([printful.com/dashboard/billing](https://printful.com/dashboard/billing))
- [ ] Switch Stripe to live mode (complete identity verification)
- [ ] Sign up for Xero (free trial) and connect bank + Stripe
- [ ] Register for GST (optional but recommended)
- [ ] Update website footer with ACN once received
- [ ] Design + order business cards (Vistaprint rush delivery or Officeworks same-day)
- [ ] Design + print QR code flyers (Officeworks — take USB with PDF)

### Sunday — Test

- [ ] Update Vercel env vars with Stripe live keys → redeploy
- [ ] Do a real $4.50 "Buy Founder a Coffee" payment to test live Stripe
- [ ] Sign up mum's cafe (or a friendly local cafe)
- [ ] Approve the cafe, watch the email/SMS flow
- [ ] Place a real order, test full lifecycle
- [ ] Drive to the cafe, complete the pickup
- [ ] Verify payment lands in Stripe live dashboard
- [ ] Delete test data / keep as your first real transaction

### Monday — Launch

- [ ] Post on Instagram/Facebook: "Pull Up Coffee is live in [your suburb]"
- [ ] Walk into 3-5 local cafes with flyers + business cards
- [ ] Pitch: "I built a platform that turns your street parking into a drive-thru. No app download, no commission on menu prices. Can I show you a 2-minute demo?"
- [ ] Sign up interested cafes on the spot (show them the signup on your phone)
- [ ] Set up Google Business Profile for Pull Up Coffee
- [ ] Monitor first real orders throughout the day

---

## PART 7: Record-Keeping Essentials (Tax Time)

### What the ATO Wants to See
1. **All income recorded** — every Stripe payment, donation, hat sale
2. **All expenses with receipts** — keep digital copies of EVERYTHING
3. **Bank statements** matching your books
4. **BAS lodged on time** (if GST registered)
5. **PAYG withholding** if you hire anyone (not applicable yet)

### Receipt Management (Free/Cheap)
- **Option A:** Xero mobile app — snap photos of receipts, auto-attaches to transactions
- **Option B:** Dedicated email (e.g., receipts@pullupcoffee.com) — forward all receipts there
- **Option C:** Google Drive folder called "Pull Up Coffee Receipts 2026" — organize by month

### What to Keep Receipts For
- Domain renewals
- Twilio top-ups
- ASIC fees
- Printful orders
- Any marketing spend (ads, printing)
- Software subscriptions
- Internet bill (% used for business)
- Phone bill (% used for business)
- Home office (if working from home — can claim $0.67/hr flat rate via ATO)

### Tax Deductions You Can Claim
- **Home office:** $0.67/hr (shortcut method) — if you work 4hrs/day = $2.68/day
- **Internet:** Business % of your plan
- **Phone:** Business % of your plan
- **All platform costs:** Twilio, domains, hosting, etc. (100% deductible)
- **Computer/equipment:** Depreciated over useful life or instant write-off if under $20,000

---

## PART 8: Revenue Projections (Conservative)

### Scenario: 10 Cafes, 5 Orders/Day Each

| Metric | Daily | Weekly | Monthly | Annual |
|--------|-------|--------|---------|--------|
| Total orders | 50 | 350 | 1,500 | 18,000 |
| Platform fee income ($0.40/order) | $20 | $140 | $600 | $7,200 |
| Hat sales (est. 2/week @ $24.25 profit) | - | $48.50 | $194 | $2,330 |
| Donations (est. $20/week) | - | $20 | $80 | $960 |
| **Gross Revenue** | | **$208.50** | **$874** | **$10,490** |

### Costs at That Scale

| Cost | Monthly |
|------|---------|
| Twilio (~500 SMS) | $50 |
| Stripe fees (~1.75% of $7,500 GMV) | $131 |
| Xero | $29 |
| Domains | $7 |
| Affiliate commissions | $15 |
| Printful cost (8 hats) | $214 |
| **Total Costs** | **$446** |
| **Net Profit** | **$428/month** |

### Break-Even Point
- At **5 cafes with 3 orders/day** you cover your fixed costs (~$100/mo)
- At **10 cafes with 5 orders/day** you're profitable (~$400+/mo)
- At **50 cafes** the numbers get genuinely exciting (~$2,500+/mo)

---

## Quick Reference: Important Dates

| Date | What | Action |
|------|------|--------|
| **Today (Feb 28)** | ASIC registration | Register company |
| **March 2 (Mon)** | Launch day | Go live, visit cafes |
| **March 31** | End of Q3 FY2026 | If GST registered, BAS period ends |
| **April 28** | BAS due | Lodge Q3 BAS (if applicable) |
| **June 30** | End of FY2026 | Financial year ends |
| **October 31** | Tax return due | Lodge company tax return (or get accountant extension to March) |
| **~Feb 2027** | ASIC annual review | $310 due |
