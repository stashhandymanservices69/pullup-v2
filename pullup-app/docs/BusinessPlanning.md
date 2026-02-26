# Pull Up Coffee - Business Planning & Sustainability

## Overview
This document outlines the cost structure, revenue model, and sustainability planning for Pull Up Coffee Pty Ltd. The goal is to create a sustainable, fair, and profitable platform that benefits cafes while maintaining platform viability.

---

## Revenue Model

### Current Model (First 100 Cafes - Early Adopter Program)
**Fee Structure:**
- Cafe keeps 100% of menu revenue
- Cafe keeps 80% of curbside convenience fee ($1.60 from $2.00 min)
- Platform receives 20% of curbside fee ($0.40 from $2.00)
- Platform covers Stripe fixed 30¢ transaction fee
- Net platform margin: ~$0.10 per order before operating costs

**Example per $100 in curbside orders (50 orders @ $2 fee each):**
- Total curbside fees collected: $100
- Cafe receives: $80
- Platform receives: $20
- Platform pays Stripe fixed fees: $15 (50 orders × 30¢)
- Platform gross margin: $5
- **Platform margin per order: $0.10**

**Sustainability Challenge:**
- After operating costs (SMS, hosting, support), net profit: ~$0.02-0.05 per order
- After company tax (~30%), net profit: ~$0.01-0.03 per order
- **This model is intentionally generous to incentivize early adoption**

---

### Future Model (Post-100 Cafes - Standard Program)
**Updated Fee Structure:**
- Cafe keeps 100% of menu revenue
- Cafe keeps 80% of curbside convenience fee
- Platform receives 20% of curbside fee
- **Customer pays Stripe 30¢ fixed fee (added at checkout)**
- Cafe still covers Stripe percentage fee (~1.75%) on their revenue portion

**Example per $100 in curbside orders:**
- Total curbside fees: $100
- Cafe receives: $80
- Platform receives: $20
- Customer pays Stripe fixed fees separately: $15
- Platform gross margin: $20
- **Platform margin per order: $0.40**

**Improved Sustainability:**
- After operating costs, net profit: ~$0.20-0.25 per order
- After tax (~30%), net profit: ~$0.14-0.18 per order
- **At 1,000 orders/day globally: $140-180/day = $4,200-5,400/month profit**

---

## Operating Costs Breakdown

### Fixed Monthly Costs

#### 1. **Payment Processing**
- Stripe account fees: $0 (pay-as-you-go)
- Alternative payment processors (future): TBD
- **Estimated: $0/month base + per-transaction**

#### 2. **Technology Infrastructure**
- Firebase Hosting + Firestore: $100-500/month (scales with usage)
- Domain registration & SSL: $50/year (~$5/month)
- CDN & edge caching: $50-200/month
- Development tools & CI/CD: $50/month
- Monitoring & analytics: $30/month
- **Estimated: $235-785/month**

#### 3. **Communication Services**
- Twilio SMS (AU): $0.10 per message
- Email service (transactional): $20/month
- **Estimated: $20/month + per-SMS**

#### 4. **Business Operations**
- **Accounting software** (Xero, MYOB): $70/month
- **Legal/compliance software**: $50/month
- **Project management tools**: $30/month
- **Estimated: $150/month**

#### 5. **Insurance & Legal**
- **Professional indemnity insurance**: $1,500-3,000/year (~$125-250/month)
- **Public liability insurance**: $800-1,500/year (~$65-125/month)
- **Cyber insurance**: $1,000-2,000/year (~$85-165/month)
- **Legal retainer** (startup-friendly): $500-1,000/month
- **Estimated: $775-1,540/month**

#### 6. **Compliance & Governance**
- ASIC annual review fee: $295/year (~$25/month)
- Privacy Act compliance audits: $500/year (~$40/month)
- IP trademark renewals: $200/year (~$15/month)
- **Estimated: $80/month**

**Total Fixed Monthly Costs: $1,260-2,575**

---

### Variable Costs (Per Order)

1. **SMS notifications**: $0.10 per delay/completion message (optional)
2. **Stripe percentage fee**: ~1.75% + GST on transaction value (cafe covers on their portion)
3. **Platform covers**: 30¢ Stripe fixed fee (early adopter model only)

**Example Variable Cost (Early Adopter):**
- $2.00 curbside order
- Platform receives: $0.40
- Platform pays Stripe fixed: $0.30
- SMS notification: $0.10 (if sent)
- Net: $0.00-0.10 depending on SMS usage

---

## Staffing Plan

### Phase 1: Solo Founder (0-100 cafes)
- Owner handles all operations
- Use automated support bot for common queries
- Manual review of applications within 1-3 business days
- **Cost: $0 salary (sweat equity)**

### Phase 2: First Hire (100-500 cafes)
- **Part-time Customer Support** (20 hrs/week): $35/hr × 20 × 4.33 = $3,031/month
- Handles merchant onboarding, support tickets, compliance checks
- **Cost: $3,000-3,500/month**

### Phase 3: Small Team (500-2,000 cafes)
- **Full-time Operations Manager**: $80,000/year (~$6,670/month)
- **Part-time Developer/DevOps**: $60/hr × 20 hrs/week = $5,200/month
- **Part-time Marketing/Affiliates Manager**: $50/hr × 15 hrs/week = $3,250/month
- **Cost: $15,120/month**

### Phase 4: Scaling Team (2,000+ cafes)
- Add full-time support staff, developers, compliance officer
- **Estimated: $40,000-60,000/month**

---

## Break-Even Analysis

### Early Adopter Model (First 100 Cafes)
**Assumptions:**
- Average $2.00 curbside fee
- Platform receives $0.40 per order
- Platform pays $0.30 Stripe fixed fee
- Net margin: $0.10 per order
- Operating costs: $1,500/month (low estimate)

**Break-even:** 15,000 orders/month across 100 cafes = 150 orders per cafe per month (~5 per day)

**Profitability Challenge:**
- With SMS costs and tax, break-even closer to 20,000-25,000 orders/month
- **This model is a loss-leader to build market presence**

---

### Standard Model (Post-100 Cafes)
**Assumptions:**
- Average $2.00 curbside fee
- Platform receives $0.40 per order
- Customer pays Stripe fixed fee separately
- Net margin: $0.40 per order
- Operating costs: $3,000/month (moderate scale)

**Break-even:** 7,500 orders/month
- With 100 cafes @ $0.40 margin: Need 75 orders per cafe per month (~2.5/day)
- **Much more sustainable**

**Profit Projection at Scale:**
- 500 cafes × 100 orders/month × $0.40 = $20,000/month revenue
- Operating costs: $5,000/month
- Gross profit: $15,000/month
- After tax (30%): **$10,500/month net profit**

---

## Forgotten/Hidden Costs (To Investigate)

### 1. **Banking & Financial**
- Business transaction account fees: $10-30/month
- Merchant facility setup: $0 (Stripe handles)
- Currency conversion (if international): N/A initially
- **Budget: $30/month**

### 2. **Professional Services**
- Annual tax return (business): $1,500-3,000
- BAS/GST quarterly lodgement: $300-500 per quarter
- Legal document reviews: $2,000-5,000/year
- **Budget: $500-800/month averaged**

### 3. **Marketing & Acquisition**
- Google Ads (if used): $500-2,000/month
- Social media ads: $300-1,000/month
- Affiliate commissions: 25% of platform fee for 30 days
- **Budget: $1,000-3,000/month when active**

### 4. **Contingency & Reserves**
- Refunds and disputes reserve: 1-2% of revenue
- Legal dispute fund: $5,000 minimum reserve
- Emergency tech maintenance: $1,000 reserve
- **Budget: Reserve $10,000 initially**

### 5. **Compliance Tools**
- GDPR/Privacy compliance tools (if expanding): $100-300/month
- Accessibility audits (WCAG compliance): $1,000/year
- Security penetration testing: $2,000-5,000/year
- **Budget: $200-500/month**

---

## Long-Term Sustainability Recommendations

### 1. **Tiered Pricing Model**
- **Tier 1 (First 100)**: Early adopter pricing (platform covers 30¢)
- **Tier 2 (101-500)**: Standard pricing (customer pays 30¢)
- **Tier 3 (500+)**: Volume pricing (negotiate better Stripe rates, pass savings to cafes)

### 2. **Premium Features (Optional Add-Ons)**
- Advanced analytics dashboard: $20/month per cafe
- Custom branded app white-label: $100/month per cafe
- Priority support: $50/month per cafe
- Loyalty program integration: $30/month per cafe

### 3. **Alternative Revenue Streams**
- Marketplace advertising (supplier ads in app): $500-2,000/month
- Data insights reports (anonymized trends for suppliers): $1,000/month
- Training/onboarding consultancy: $150/hr

### 4. **Cost Reduction Strategies**
- Negotiate bulk SMS rates with Twilio (once at scale)
- Migrate to cost-effective cloud provider if Firebase becomes expensive
- Implement better payment processor (PayPal, Adyen) if cheaper
- Automate more support with AI to reduce staffing needs

---

## Risk Mitigation

### Insurance Coverage Needed
1. **Professional Indemnity**: Covers errors in platform service
2. **Public Liability**: Covers third-party injury/damage claims
3. **Cyber Insurance**: Covers data breaches, ransomware
4. **Directors & Officers**: Protects personal assets (once incorporated)

### Legal Protection
1. Maintain comprehensive Terms of Service
2. Clear Privacy Policy (Privacy Act compliant)
3. Refund policy clearly states cafe responsibility
4. IP protection: Trademark "Pull Up Coffee" registered

---

## Accounting Software Setup

### Recommended Tools
1. **Xero** ($70/month): Cloud accounting, integrates with Stripe
2. **Receipt Bank/Dext**: Automate expense tracking
3. **TaxDojo**: Australian tax compliance automation
4. **Link to business bank account** for automatic reconciliation

### Reporting Requirements
- Monthly P&L review
- Quarterly BAS lodgement (if GST registered)
- Annual tax return
- Real-time dashboard tracking: Revenue, costs, profit margin per order

---

## Key Performance Indicators (KPIs)

### Financial KPIs
1. **Revenue per order**: $0.10 (early) → $0.40 (standard)
2. **Net profit margin**: 5-10% (early) → 50-60% (standard at scale)
3. **Monthly recurring revenue**: Target $10,000 by year 1
4. **Churn rate**: <5% monthly cafe dropout

### Operational KPIs
1. **Orders per cafe per day**: Target 5-10
2. **Application approval time**: <24 hours (standard), <72 hours (peak)
3. **Support ticket resolution time**: <4 hours
4. **Platform uptime**: 99.5%+

---

## Conclusion

**Current State (0-100 Cafes):**
- Intentionally running at low/no profit to gain market traction
- Focus on delivering exceptional value to cafes
- Build reputation and proof of concept

**Target State (100+ Cafes):**
- Transition to standard model with customer-paid fixed fees
- Achieve sustainable $10k-20k monthly profit by 500 cafes
- Reinvest profits into better technology, lower fees, more payment options

**Long-Term Vision (1,000+ Cafes):**
- Generate sufficient profit to hire team, improve platform continuously
- Explore international expansion (NZ, UK, US)
- Remain fair and cafe-friendly while maintaining business viability

**The goal is never to be greedy, but to create a platform so valuable that cafes can't imagine operating without it.**

---

## Action Items

- [ ] Open business bank account and connect to Xero
- [ ] Purchase professional indemnity insurance ($2k/year budget)
- [ ] Set up legal retainer with startup-friendly law firm
- [ ] Create financial model spreadsheet tracking real-time profitability
- [ ] Monitor whether 30¢ subsidy is sustainable or needs adjustment
- [ ] Negotiate better Stripe rates once hitting $50k/month volume
- [ ] Explore PayPal/Adyen integration for cost comparison
- [ ] Build financial dashboard showing: orders, revenue, costs, net profit
- [ ] Set aside 30% of profit for tax obligations
- [ ] Create 6-month cash reserve for unexpected costs

---

**Last Updated:** February 24, 2026  
**Document Owner:** Steven Weir, Founder  
**Review Frequency:** Quarterly
