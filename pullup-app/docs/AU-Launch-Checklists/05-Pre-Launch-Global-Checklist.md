# 05 — Pre-Launch Global Checklist (March 2026)

> **Purpose:** Everything you need to do before, during, and after going live globally.
> Organised by priority: **Must Do Before Launch** → **Do Within First Week** → **Do Within First Month** → **Can Wait Until Revenue Justifies It**.

---

## PHASE 1: MUST DO BEFORE LAUNCH (Blocking)

### Platform / Technical
- [ ] **Stripe Connect tested end-to-end** — create a test cafe, connect Stripe, place a test order, verify funds flow correctly (99¢ to platform, rest to cafe)
- [ ] **Clear all test/old cafe data** from Firestore — only your master admin account should remain
- [ ] **Lock screen active** — access code required for production site
- [ ] **Verify $0.99 flat service fee** appears correctly at checkout (line item: "Pull Up Service Fee")
- [ ] **Verify curbside fee range $0–$25** works — test $0 (no curbside), $2, $10, $25
- [ ] **Verify affiliate commission** calculates at 25% of $0.99 = ~$0.25/order (not the old $0.10)
- [ ] **Verify early adopter detection** — first 100 cafes get `transactionCostModel: 'early-adopter-partner-bonus'`
- [ ] **Test order flow** — place order → cafe accepts → marks preparing → marks ready → customer picks up → payment captured
- [ ] **Test order decline** — cafe declines → customer notified → auth hold voided
- [ ] **Test SMS notifications** — order received, order ready, delay messages
- [ ] **Verify emails send** — signup confirmation, approval, affiliate welcome (check they show new $0.99 pricing)
- [ ] **Remove lock screen when ready** or share access code with initial testers

### Legal / Compliance (FREE steps)
- [ ] **ABN is active** — check on ABR (abr.gov.au). If not registered, register as Sole Trader ($0, takes 5 min online)
- [ ] **Business name registered** — "Pull Up Coffee" with ASIC ($39 for 1 year, $92 for 3 years). Do this at asic.gov.au
- [ ] **GST registration** — NOT required until you hit $75K revenue/year. Skip for now, register later when approaching threshold
- [ ] **Terms of Service live on site** — ✅ Already embedded in the legal modal (region-aware)
- [ ] **Privacy Policy live on site** — ✅ Already embedded (Privacy Act 1988, GDPR, CCPA compliant)
- [ ] **Affiliate terms live on site** — ✅ Already embedded with disclosure requirements

---

## PHASE 2: DO WITHIN FIRST WEEK (Important but not blocking)

### Insurance
- [ ] **Public Liability Insurance** — Get quotes (BizCover, Insurance House, or your broker). ~$30–$50/month for a digital platform. You don't handle food or employ drivers, so premiums are low. This protects you if a customer claims they were injured at a curbside pickup
- [ ] **Professional Indemnity Insurance** — Covers you if a cafe claims your platform caused them financial loss. Often bundled with public liability. ~$20–$40/month additional
- [ ] **Cyber Liability Insurance** — Optional but recommended once handling customer data. ~$15–$30/month. Can wait until revenue justifies it

### Banking & Accounting
- [ ] **Separate business bank account** — Open a simple business transaction account (most AU banks offer free ones for sole traders). Keep personal and business finances separate from day one
- [ ] **Track all income** — Your Stripe dashboard is your primary record. Download monthly CSV exports
- [ ] **Track all expenses** — Keep receipts for: domain, hosting upgrades, Twilio, marketing, insurance, any equipment. These are all tax deductions

### Stripe
- [ ] **Verify your own Stripe account** is fully verified and can receive payouts
- [ ] **Test that Stripe Connect onboarding works** for a new cafe (use your test cafe)
- [ ] **Confirm payout schedule** — daily, weekly, or manual (your choice)

---

## PHASE 3: DO WITHIN FIRST MONTH (Growth & Compliance)

### Tax
- [ ] **Set up accounting software** — Xero ($15/mo starter) or Wave (free). Not urgent at low volume — you can use a spreadsheet initially. Install when you have >10 orders/week
- [ ] **Understand BAS obligations** — If NOT registered for GST (under $75K), you don't need to lodge BAS. When you register, you'll lodge quarterly. Your Stripe payouts + expenses form the basis
- [ ] **Track the $75K GST threshold** — Once your TOTAL annual revenue (not profit) approaches $75K, register for GST. At $0.99/order, that's ~75,758 orders/year or ~6,300/month. You have time

### Marketing (Low/No Cost)
- [ ] **Google Business Profile** — Free. Set up for "Pull Up Coffee" so you appear in local searches
- [ ] **Social media accounts** — Instagram, TikTok, Facebook. Start posting cafe partner stories
- [ ] **QR posters** — Print for partner cafes (the QR generator is built into the dashboard)
- [ ] **Engage first affiliates** — The affiliate program is live and auto-approves. Promote it

### Operations
- [ ] **Onboarding videos** — ✅ Already linked in dashboard. Film updated versions when ready
- [ ] **Support process** — hello@pullupcoffee.com is live. Monitor daily during first month
- [ ] **Monitor Twilio costs** — At 2 SMS/order × $0.0515 = $0.103/order. Watch this as orders scale

---

## PHASE 4: CAN WAIT UNTIL REVENUE JUSTIFIES IT

These are NOT needed at launch. Only invest when the business is generating consistent revenue.

| Item | When to Do It | Estimated Cost | Why Wait |
|------|--------------|----------------|----------|
| **Vercel Pro** | >100GB bandwidth/month | $20/mo | Free hobby tier handles early traffic fine |
| **Firebase Blaze** | >50K reads/day | $25+/mo | Spark free tier is plenty for launch |
| **Resend Pro** | >100 emails/day | $20/mo | Free tier handles 3000/month |
| **Accounting Software** | >$500/month revenue | $15–60/mo | Spreadsheet works initially |
| **Business Insurance** | Within first week ideally, but after first month latest | $50–120/mo | Get quotes immediately but don't rush |
| **Capacitor App (Push Notifications)** | When SMS costs exceed $200/mo | $15/mo (Apple + Google fees) | Biggest cost-saving lever — eliminates ~80% of SMS costs |
| **Virtual Assistant** | >50 active cafes | $500–1500/mo | You can manage support yourself initially |
| **Marketing/Ads Budget** | After product-market fit confirmed | $200–2000/mo | Organic first, paid later |
| **Stripe Atlas (US incorporation)** | Expanding to US market | $500 one-time | Only if US expansion is real |
| **Customer Support Tool** | >100 active cafes | $25–50/mo | Email + chatbot handles early support |
| **CDN/Asset Storage** | Menu images exceeding Firebase limits | $5–20/mo | Firestore handles early volume |

---

## COST SUMMARY: What You're Actually Paying at Launch

| Item | Monthly Cost |
|------|-------------|
| Google Workspace (email) | $8.40 |
| Domain (pullupcoffee.com) | ~$2.50 |
| Twilio Phone Number (AU) | $6.50 |
| Twilio SMS (~100 orders/mo) | ~$10.30 |
| **TOTAL at launch** | **~$27.70/mo** |

Everything else is free tier or can wait. You only need ~32 orders/month at $0.887 net/order to break even on these costs.

---

## KNOWN RISKS & PITFALLS TO WATCH FOR

### Financial
1. **Chargebacks** — Stripe charges $25 per dispute. Even a 0.1% rate matters. Mitigation: clear refund policy, responsive support
2. **Refunds** — Stripe keeps its processing fee on refunded orders. Budget for occasional refunds
3. **SMS cost creep** — If orders grow but you're still on SMS, costs climb fast. Prioritise the Capacitor app for push notifications
4. **Currency conversion** — Stripe adds ~1% for cross-currency. For AU-only launch, not an issue. Watch when expanding

### Legal
5. **GST threshold** — Register BEFORE you hit $75K, not after. ATO penalties for late registration
6. **Privacy complaints** — You're handling customer location data (GPS). Already purging after order completion ✅. Document this for any OAIC inquiry
7. **Affiliate disclosure** — Your affiliate terms require disclosure. Monitor that affiliates actually comply

### Operational
8. **Cafe menu price inflation** — Some cafes might charge more on Pull Up than in-store. The dashboard encourages transparency but you can't enforce it. Monitor and reach out privately if noticed
9. **Stripe Connect delays** — New cafe Stripe onboarding can take 1–3 business days for verification. Set expectations
10. **Single point of failure** — You're the sole operator. If you're unavailable, support stops. Plan for this as you scale

### Technical
11. **Firebase Spark limits** — 50K reads/day, 20K writes/day. A busy day with 50+ cafes could hit this. Upgrade to Blaze when you notice slowdowns (pay-as-you-go, usually $25–50/mo)
12. **Vercel cold starts** — Serverless functions may be slow on first request after inactivity. Not usually noticeable for users
13. **Twilio number per country** — You need a separate phone number ($6.50/mo each) per country for SMS. Factor this into international expansion costs

---

## TOMORROW'S TESTING CHECKLIST (Quick Reference)

1. [ ] Stripe Connect: Connect your test cafe account
2. [ ] Place a test order through the full checkout flow
3. [ ] Verify $0.99 service fee appears properly
4. [ ] Verify curbside fee ($0, $2, $5) charged to customer and sent to cafe
5. [ ] Accept the order → prepare → mark ready → SMS sent
6. [ ] Capture payment → verify funds split correctly in Stripe dashboard
7. [ ] Decline an order → verify auth hold void
8. [ ] Test affiliate signup → verify welcome email shows correct $0.25/order commission
9. [ ] Check café dashboard → Revenue Uplift calculator shows correct numbers
10. [ ] Test the "Why Pull Up?" comparison section in Support tab
11. [ ] Verify lock screen still blocks unauthorized access

---

*Generated March 2026. Update as items are completed.*
