# Pull Up Coffee — Comprehensive Legal & Compliance Audit
## Prepared for External Legal Review (Lawyers, Insurers, Compliance Advisors)

> **Purpose:** This document provides a complete overview of the Pull Up Coffee platform — what it does, how data flows, what legal protections are already in place, where gaps exist, and what a lawyer needs to review to ensure the founder is fully protected, over-compliant, and future-proofed against legal risk.
>
> **Entity:** Pull Up Coffee Pty Ltd (ABN: 17 587 686 972)  
> **Founder & Sole Creator:** Steven Weir  
> **Home Jurisdiction:** New South Wales, Australia  
> **Date:** March 2026  
> **Platform URL:** https://pullupcoffee.com

---

## TABLE OF CONTENTS

1. [Platform Overview & Business Model](#1-platform-overview--business-model)
2. [All Parties & Their Relationships](#2-all-parties--their-relationships)
3. [Complete Data Inventory](#3-complete-data-inventory)
4. [Money Flow & Payment Processing](#4-money-flow--payment-processing)
5. [Existing Legal Documents (Already Live)](#5-existing-legal-documents-already-live)
6. [Existing Security & Technical Protections](#6-existing-security--technical-protections)
7. [Liability Exposure Analysis](#7-liability-exposure-analysis)
8. [Insurance Requirements](#8-insurance-requirements)
9. [Intellectual Property Position](#9-intellectual-property-position)
10. [Regulatory Compliance by Jurisdiction](#10-regulatory-compliance-by-jurisdiction)
11. [Gaps & Missing Protections](#11-gaps--missing-protections)
12. [Recommendations for Legal Counsel](#12-recommendations-for-legal-counsel)
13. [Where Legal Content Lives on the Website](#13-where-legal-content-lives-on-the-website)
14. [Appendix: Firestore Collections & Data Schema](#appendix-firestore-collections--data-schema)

---

## 1. PLATFORM OVERVIEW & BUSINESS MODEL

### What Pull Up Coffee Does:
Pull Up Coffee is a **curbside coffee ordering platform** — a digital marketplace bridge connecting customers with independent cafes for curbside pickup. The platform operates as follows:

1. **Customer** opens the web app (no native app download required)
2. Customer browses nearby cafes, views menus, places an order
3. Payment is authorised via Stripe (hold placed, not charged yet)
4. **Cafe** receives the order notification via the web dashboard + SMS
5. Cafe accepts or declines the order (payment captured or released)
6. Customer drives to the cafe, the cafe brings the order curbside to the customer's vehicle
7. Customer confirms delivery or order auto-completes

### What Pull Up Coffee Does NOT Do:
- ❌ Does NOT prepare, handle, store, or deliver food or beverages
- ❌ Does NOT employ drivers, runners, or delivery personnel
- ❌ Does NOT set menu prices (cafes control their own)
- ❌ Does NOT handle cash — all payments via Stripe
- ❌ Does NOT store credit card numbers (Stripe handles PCI compliance)
- ❌ Does NOT physically interact with the customer or their vehicle
- ❌ Does NOT provide food safety training or certification
- ❌ Does NOT own or lease vehicles

### Revenue Model:
- Cafes set a "Curbside Runner Fee" ($2.00–$6.00) on top of menu prices
- Platform takes 20% of the curbside fee (currently)
- Stripe processing (1.75% + $0.30) is transparently passed to the customer
- Cafes keep 100% of menu item prices + 80% of curbside fee

### Platform Architecture:
- **Frontend:** Next.js web app hosted on Vercel (server-side rendered)
- **Backend:** Vercel serverless functions (API routes)
- **Database:** Google Firebase Firestore (NoSQL)
- **Auth:** Firebase Authentication (email/password + optional 2FA via SMS)
- **Payments:** Stripe Connect (Express accounts for cafe payouts)
- **SMS:** Twilio (order notifications, 2FA codes, cafe alerts)
- **Email:** Resend (signup notifications, admin alerts)
- **Domain:** pullupcoffee.com via Vercel

---

## 2. ALL PARTIES & THEIR RELATIONSHIPS

### Party 1: Pull Up Coffee Pty Ltd (The Platform)
- **Role:** Technology provider, payment bridge, marketplace operator
- **Relationship to cafes:** Independent contractor / service provider (NOT employer, NOT agent, NOT partner, NOT joint venture)
- **Relationship to customers:** Service provider of digital ordering technology (NOT seller of goods, NOT food handler)
- **Relationship to affiliates:** Independent contractor arrangement (NOT employer)

### Party 2: Cafe Partners (Merchants)
- **Role:** Independent businesses that list menus and fulfill orders
- **Onboarding:** Sign up via web form → admin approval → Stripe Connect onboarding
- **Data provided at signup:** Business name, store phone, owner mobile, address, email, ABN, Google Business URL, business description, billing email, country
- **Obligations under terms:** Maintain food safety, public liability insurance, comply with local regulations, handle refunds/disputes
- **Payment:** Via Stripe Connect Express accounts (cafe receives direct payouts from Stripe)

### Party 3: Customers (Consumers)
- **Role:** Place orders, make payments, collect curbside
- **Data provided:** Name, car model, car colour, license plate, mobile number, GPS location (optional), car photo (optional)
- **Payment:** Via Stripe Checkout (card details never touch the platform server)
- **No account required for browsing** — account required for ordering

### Party 4: Affiliates (Referral Partners)
- **Role:** Refer new cafes to the platform in exchange for commission
- **Relationship:** Independent contractor (explicitly not employee)
- **Commission:** 25% of platform fee for 30 calendar days per referred cafe
- **Data provided:** Name, email, phone (optional), country, social channels, preferred referral code
- **Payment:** Monthly via Stripe, paid gross (no tax withheld)

### Party 5: Platform Admin (Founder)
- **Role:** Steven Weir — sole operator, developer, administrator
- **Access:** P.U.L.S.E. Command Centre (admin dashboard) — requires specific Firebase UID + admin token
- **Capabilities:** Approve/decline cafes, view all orders, manage settings, view analytics

---

## 3. COMPLETE DATA INVENTORY

### 3.1 Customer Data Collected

| Data Field | Purpose | Storage | Retention | Encryption | Legal Basis |
|---|---|---|---|---|---|
| **Name** | Order identification, curbside handoff | Firestore (`orders` collection) | Indefinite (in order history) | At rest (Firebase) | Contract performance |
| **Mobile Number** | SMS notifications (order ready, delays) | Firestore (`orders`) | Indefinite | At rest | Contract performance |
| **Car Model** | Curbside identification | Firestore (`orders`) | Indefinite | At rest | Contract performance |
| **Car Colour** | Curbside identification | Firestore (`orders`) | Indefinite | At rest | Contract performance |
| **License Plate** | Curbside identification | Firestore (`orders`) | Indefinite | At rest | Contract performance |
| **GPS Coordinates** | ETA calculation, arrival detection | Firestore (`orders`) | **24-hour auto-purge** | At rest | Legitimate interest / Consent |
| **Car Photo** | Visual identification for cafe runner | Firestore (`orders`) as base64 | **24-hour auto-purge** | At rest | Consent |
| **Email** | Account creation, Firebase Auth | Firebase Auth + Firestore | Until deletion request | At rest | Contract performance |
| **Password** | Authentication | Firebase Auth (hashed) | Until deletion request | Hashed (bcrypt) | Contract performance |
| **Payment Card Details** | Payment processing | **Stripe only** — never touches our server | Per Stripe retention | PCI-DSS Level 1 | Contract performance |
| **IP Address** | Security, rate limiting, analytics | In-memory (rate limiter) + Firestore (`site_analytics`, `security_events`) | Analytics: indefinite. Rate limiter: in-memory, cleared periodically | At rest | Legitimate interest |
| **User Agent** | Analytics, bot detection | Firestore (`site_analytics`) | Indefinite | At rest | Legitimate interest |
| **Screen Size / Load Time** | Analytics | Firestore (`site_analytics`) | Indefinite | At rest | Legitimate interest |
| **Country** | Region detection, legal compliance | Derived from Vercel header (`x-vercel-ip-country`) | In analytics records | At rest | Legitimate interest |
| **Session ID** | Analytics deduplication | Generated client-side via `crypto.randomUUID()`, stored in sessionStorage | Browser session only | N/A | Legitimate interest |
| **Referrer URL** | Traffic source analytics | Firestore (`site_analytics`) | Indefinite | At rest | Legitimate interest |

### 3.2 Cafe (Merchant) Data Collected

| Data Field | Purpose | Storage | Retention |
|---|---|---|---|
| **Business Name** | Display, identification | Firestore (`cafes`) | Until account deletion |
| **Store Phone** | Customer support contact | Firestore (`cafes`) | Until account deletion |
| **Owner Mobile** | SMS notifications, 2FA | Firestore (`cafes`) | Until account deletion |
| **Email** | Auth, notifications, billing | Firebase Auth + Firestore | Until account deletion |
| **ABN** | Business verification, anti-fraud | Firestore (`cafes`) | Until account deletion |
| **Address** | Location display, discovery | Firestore (`cafes`) | Until account deletion |
| **Google Business URL** | Verification, SEO | Firestore (`cafes`) | Until account deletion |
| **Business Description** | Profile display | Firestore (`cafes`) | Until account deletion |
| **Billing Email** | Financial communications | Firestore (`cafes`) | Until account deletion |
| **Country** | Regulatory compliance, Stripe routing | Firestore (`cafes`) | Until account deletion |
| **Stripe Account ID** | Payment routing | Firestore (`cafes`) | Until account deletion |
| **Menu Items** | Customer browsing, ordering | Firestore (sub-collection under `cafes`) | Until cafe deletes items |
| **Curbside Fee** | Pricing, revenue split | Firestore (`cafes`) | Until changed |
| **Logo** | Branding, discovery | Firestore (`cafes`) as base64 | Until changed/deleted |
| **Operating Hours** | Availability display | Firestore (`cafes`) | Until changed |

### 3.3 Affiliate Data Collected

| Data Field | Purpose | Storage | Retention |
|---|---|---|---|
| **Name** | Identification | Firestore (`affiliates`) | Until account deletion |
| **Email** | Communications, dashboard login | Firestore (`affiliates`) | Until account deletion |
| **Phone** (optional) | Contact | Firestore (`affiliates`) | Until account deletion |
| **Country** | Tax/legal compliance | Firestore (`affiliates`) | Until account deletion |
| **Social Channels** | Verification, qualification | Firestore (`affiliates`) | Until account deletion |
| **Referral Code** | Tracking, attribution | Firestore (`affiliates`) | Until account deletion |
| **Commission Records** | Payout calculation | Firestore (`affiliate_commissions`) | Indefinite (financial records) |

### 3.4 Analytics & Security Data Collected

| Collection | Data Fields | Purpose | Legal Basis |
|---|---|---|---|
| **`site_analytics`** | IP (hashed), UA (parsed to device/browser/OS), country, path, view, referrer, screen size, load time, session ID, timestamp | Platform performance, traffic analysis | Legitimate interest |
| **`security_events`** | IP, country, UA, event type, path, details, severity, timestamp | Intrusion detection, abuse prevention | Legitimate interest / Legal obligation |

### 3.5 Data That is NOT Collected
- ❌ Credit/debit card numbers (handled exclusively by Stripe)
- ❌ Government ID / driver's license
- ❌ Date of birth / age
- ❌ Social security numbers / Tax file numbers
- ❌ Health information
- ❌ Biometric data
- ❌ Browsing history on other sites
- ❌ Contacts or phone book data
- ❌ Microphone or camera access (car photo is voluntary)

### 3.6 Data Purging & Retention Rules
| Data Type | Purge Rule | Implementation |
|---|---|---|
| GPS coordinates | 24-hour auto-purge after order completion | Cron sweep or manual |
| Car photos (base64) | 24-hour auto-purge after order completion | Cron sweep or manual |
| 2FA codes | 5-minute expiry, SHA-256 hashed | Firebase custom claims + auto-clear |
| Rate limiter entries | In-memory, cleared on map overflow (10K entries) or periodic 60s intervals | Server-side `setInterval` |
| Ghost hold orders | 72-hour sweep → status set to "expired", Stripe auth voided | Vercel cron job every 6 hours (`/api/cron/sweep`) |

---

## 4. MONEY FLOW & PAYMENT PROCESSING

### 4.1 Order Payment Flow
```
1. Customer places order → Stripe creates PaymentIntent with manual capture
2. Authorisation hold placed on customer's card (NOT charged yet)
3. Cafe receives notification → Reviews order
4. IF cafe ACCEPTS: Stripe captures payment → Funds flow
5. IF cafe DECLINES: Authorisation released → Customer is NOT charged
6. IF cafe does NOTHING for 72 hours: Ghost Hold Sweeper auto-cancels
```

### 4.2 Where the Money Goes (per order)
```
Customer's card is charged: $14.04 (example)
├── Menu items:                    $11.50 → 100% to CAFE (via Stripe Connect)
├── Curbside Runner Fee:           $2.00
│   ├── 80% ($1.60):              → to CAFE (via Stripe Connect)
│   └── 20% ($0.40):              → to PLATFORM (application fee)
└── Stripe processing fee:         $0.54 → to STRIPE
```

### 4.3 Stripe Connect Structure
- **Account type:** Express (Stripe-hosted onboarding, Stripe manages KYC/AML)
- **Platform:** Pull Up Coffee is the Connect platform
- **Connected accounts:** Each cafe has its own Stripe Express account
- **Application fee:** Platform takes its share via Stripe's `application_fee_amount` parameter
- **Payouts:** Stripe pays cafes directly per their Stripe dashboard settings
- **Refunds:** Initiated by cafe or platform; Stripe fee is NOT refunded to platform
- **Chargebacks:** Cafe bears chargeback risk post-capture (per terms)

### 4.4 Merch / Donation Payments
- Separate payment flow via `/api/stripe/merch`
- No Stripe Connect — payments go directly to platform Stripe account
- Tiers: Coffee ($4.50), Legend ($10), VIP (custom $5+), Founders Cap ($45 + $10 shipping)
- Physical items (cap) collect shipping address via Stripe Checkout
- **No authentication required** for merch purchases (guest checkout)

### 4.5 Affiliate Payouts
- Commission calculated: 25% of platform application fee for referred cafe's orders during first 30 days
- Tracked in Firestore `affiliate_commissions` collection
- Paid monthly via Stripe (to affiliate's connected account)
- Paid gross — no tax withheld

---

## 5. EXISTING LEGAL DOCUMENTS (Already Live in Production)

### 5.1 Consumer Terms of Service (19 Clauses, Region-Aware)
**Location in code:** `app/page.tsx` lines 629-653  
**Accessible via:** Footer link → Legal modal → "Terms" tab  
**Last updated:** 27 February 2026

**Clauses covered:**
1. Platform bridge role — explicitly NOT a food handler, NOT an agent
2. Dynamic pass-through pricing — transparency of Stripe fees
3. Merchant responsibility — food quality/safety is cafe's obligation
4. Consumer guarantees — Australian Consumer Law + region-specific (UK Consumer Rights Act, NZ CGA, etc.)
5. Authorisation hold & capture flow
6. Refunds & chargebacks — cafe is the supplier, cafe determines refund eligibility
7. Traffic compliance — not liable for driving offences
8. Limitation of liability — capped at $50 or 12-month fees (whichever less)
9. Assumption of risk — burns, spills, traffic, allergens
10. Data privacy — GPS purge, Privacy Act compliance
11. Anti-automation — bots, scrapers, AI agents prohibited
12. User conduct — fraud, reverse engineering, unsafe driving → termination
13. Dispute resolution — region-specific ADR/arbitration (AU: NSW courts, US: AAA binding arbitration, EU: ODR platform)
14. Force majeure
15. Severability & entire agreement
16. No association (with similarly-named entities)
17. Affiliate referral code timing (no retroactive application)
18. Governing law & jurisdiction
19. Tax disclosures (GST/VAT/Sales Tax per region)

**Region-aware for:** AU, US, GB, EU, NZ, CA, OTHER (7 jurisdictions)

### 5.2 Merchant Partner Agreement (8 Clauses)
**Location in code:** `app/page.tsx` lines 655-666  
**Accessible via:** Legal modal → "Terms" tab (below consumer terms)

**Clauses covered:**
1. Platform bridge model — merchants receive 100% menu + 80% curbside fee
2. Authorisation & capture — manual capture flow, 72-hour ghost sweep
3. Full indemnification — cafe indemnifies platform for food safety, allergens, product defects, IP infringement, parking violations, pedestrian injuries
4. Curbside compliance — cafe responsible for zoning, traffic, pedestrian safety
5. Insurance requirement — public & product liability insurance (minimum varies by region: AU $10M, US $2M, GB £5M, NZ $5M NZD, CA $5M CAD)
6. Data security — cafe must comply with relevant privacy law + PCI-DSS
7. Data breach notification — 24-hour window to notify platform
8. Termination — 7 days written notice, immediate for breach

### 5.3 Privacy Policy (Region-Aware)
**Location in code:** `app/page.tsx` lines 669-685  
**Accessible via:** Legal modal → "Privacy" tab

**Covered:**
- Data collection disclosure (GPS, profile, transactions, analytics)
- Legal basis: GDPR Article 6(1)(b)/(f) (EU/GB), CCPA/CPRA (US), Privacy Act 1988 APPs (AU)
- Data minimisation — only what's needed for order fulfillment
- GPS purge upon order completion
- No sale to third-party data brokers
- International data transfers — SCCs for EU/GB, PIPEDA compliance for CA
- Data security — cybersecurity infrastructure + breach notification obligation
- User rights — access, correction, deletion requests via hello@pullupcoffee.com
- GDPR-specific: data portability, restriction, right to object, DPO contact
- CCPA-specific: "Do Not Sell" disclosure (platform does not sell data)
- DPO: hello@pullupcoffee.com

### 5.4 Cookie Policy
**Location in code:** `app/page.tsx` lines 687-701  
**Accessible via:** Legal modal → "Cookies" tab

**Covered:**
- Cookie categories: Essential, Performance, Functional, Targeting
- Consent model per region (EU/GB: explicit opt-in; US: opt-out; AU: transparency)
- Third-party trackers disclosed: Stripe, Firebase
- Reference to Consent Management Platform for preference management
- User control: device settings to manage cookies
- Supervisory authority acknowledgment

### 5.5 Affiliate Agreement (10 Clauses + Tax/Legal Status Box)
**Location in code:** `app/page.tsx` lines 751-775  
**Accessible via:** Legal modal → "Affiliate" tab

**Covered:**
1. Commission structure with worked example
2. Commission window (30 calendar days from first transaction)
3. Payout schedule (monthly, gross, via Stripe)
4. Sustainable growth rationale
5. IP licensing (limited, revocable)
6. Disclosure requirements per region (AU: ACCC/Consumer Law, US: FTC, UK: ASA, etc.)
7. Anti-spam compliance per region
8. Full indemnification
9. Prohibited methods (bots, AI, fake accounts)
10. Referral code mechanics

**Tax/Legal Status Box (per region):**
- Independent contractor status — explicitly not employee
- No tax withholding — platform pays gross
- Tax obligation disclosure (AU: ATO, US: IRS/1099-NEC, UK: HMRC, CA: CRA, NZ: IRD)
- Record keeping obligation on affiliate

### 5.6 Intellectual Property Notice & Certificate of Priority
**Location in code:** `app/page.tsx` lines 880-916  
**Accessible via:** Legal modal → "IP" tab

**Covered:**
- Full copyright assertion: © 2025-2026 Steven Weir / Pull Up Coffee Pty Ltd
- Legal basis: Copyright Act 1968 (AU), Berne Convention, + region-specific IP laws
- Trademark notice: "Pull Up Coffee" and logo — Trade Marks Act 1995 (AU)
- Novel functionality claimed (prior art): Dynamic curbside fee, auth-hold payment, GPS arrival, late forfeiture, manual override, favourites SMS notifications, pass-through fee transparency
- Digital signature reference + SHA-256 cryptographic timestamp hash
- Evidentiary preservation protocol (GitHub commits, SHA-256 hashes, counsel copies, WIPO Proof timestamps)
- Enforcement statement: cease-and-desist → legal proceedings → injunctive relief + damages

### 5.7 Customer FAQ / Support
**Location in code:** `app/page.tsx` lines 706-740  
**Accessible via:** Legal modal → "FAQ" tab

**Covered:**
- What happens at checkout (authorisation hold explanation)
- GPS tracking disclosure and voluntary nature
- ETA system explanation
- Data deletion process (email hello@pullupcoffee.com)
- Payment disputes → contact cafe directly
- Platform role limitation

### 5.8 Customer Support Modal
**Location in code:** `app/page.tsx` lines 296-323  
**Accessible via:** Active order → "Issue with Order?" button

**Key legal feature:** Explicitly redirects customers to the cafe for refund/order issues. Reinforces the platform-as-bridge role. Provides cafe phone number and order reference.

---

## 6. EXISTING SECURITY & TECHNICAL PROTECTIONS

### 6.1 API Security (`requestSecurity.ts`)
| Protection | Implementation | Coverage |
|---|---|---|
| **Origin allowlist** | Hardcoded production origins (pullupcoffee.com variants) + VERCEL_URL | All API routes |
| **Content-Type enforcement** | Only `application/json` accepted | All POST routes |
| **Rate limiting** | In-memory, per-IP per-route, configurable max/window | All routes (varies: 5-30 req/min) |
| **Rate limiter OOM protection** | Map ceiling at 10,000 entries, periodic pruning | Server-wide |
| **Firebase Auth verification** | Bearer token in Authorization header, `verifyIdToken(token, true)` | All authenticated routes |
| **Firestore path traversal prevention** | `isValidCafeId()` — regex `/^[a-zA-Z0-9_-]{1,128}$/` | All routes taking cafe IDs |
| **Body size cap** | 64KB maximum | All routes |
| **Safe JSON parsing** | Try/catch wrapper, returns null on failure | All routes |
| **CORS** | Strict Access-Control headers matching origin allowlist | All routes |

### 6.2 Bot Defence (`botDefense.ts`)
- 40+ user agent patterns blocked (curl, wget, python-requests, scrapy, etc.)
- Burst detection: 4 requests in 5 seconds → blocked
- Applied on: checkout, connect, twilio, admin routes

### 6.3 SMS Security
- **Server-side template system:** Only predefined SMS templates can be sent (7 templates)
- **No arbitrary message content:** Client only sends `template` key + context variables
- **Per-order SMS cap:** Maximum 2 SMS per order ID
- **AU-only validation:** Only `+614XXXXXXXX` format accepted
- **Rate limited:** 6 requests per IP per minute

### 6.4 2FA Implementation
- Optional for cafe accounts
- 6-digit code sent via SMS
- SHA-256 hashed before storage
- 5-minute expiry, auto-cleared
- Rate limited: can only request code every 60 seconds

### 6.5 Access Lock (Pre-Launch Gate)
- Site behind access code during pre-launch
- HMAC-SHA-256 signed token stored in httpOnly cookie
- 3-hour TTL
- Timing-safe comparison to prevent timing attacks
- Rate limited: 10 attempts per IP per minute
- Failed attempts logged to security events

### 6.6 Admin Security (P.U.L.S.E.)
- Requires specific Firebase UID (`dH1k7AIzIySJcxxMgMppWZcNIWT2`)
- Requires admin token match (`x-admin-token` header)
- Role check: `isPlatformAdmin === true || role === 'platform_admin'`
- Failed login attempts logged to security events

### 6.7 Analytics & Intrusion Detection
- Beacon tracks page views (view, path, session, device, referrer)
- Security events logged: failed access codes, rate limit hits, failed admin logins
- Severity levels: low, medium, high, critical
- Alert banner in P.U.L.S.E. for high-severity events in last 24 hours
- Country/IP tracking for geographic threat detection

### 6.8 Ghost Hold Sweeper (Financial Safety)
- Cron job runs every 6 hours via Vercel cron
- Finds orders in "pending" status older than 72 hours
- Cancels Stripe PaymentIntent (releases authorisation hold)
- Sets order status to "expired"
- Protected by CRON_SECRET in Bearer token

---

## 7. LIABILITY EXPOSURE ANALYSIS

### 7.1 Areas Where Platform Has MINIMAL Liability (Well-Protected)

| Risk | Current Protection | Status |
|---|---|---|
| **Food safety / allergens** | Terms explicitly disclaim; cafe indemnifies; cafe responsibility stated in 3 places | ✅ Strong |
| **Product quality** | Terms disclaim; Australian Consumer Law carve-out preserved | ✅ Strong |
| **Payment card data** | Stripe handles all card data; platform never touches card numbers; PCI scope is Stripe's | ✅ Strong |
| **Traffic accidents** | Terms disclaim; "do not use while driving" warning; assumption of risk clause | ✅ Strong |
| **Parking violations** | Terms disclaim; cafe responsible for curbside compliance | ✅ Strong |
| **IP protection** | Copyright, trademark, prior art, SHA-256 evidence, enforcement statement | ✅ Strong |
| **Affiliate relationship** | Independent contractor, indemnification, disclosure requirements, anti-abuse | ✅ Strong |
| **Bot/scraping** | Bot defence layer, anti-automation clause in terms, rate limiting | ✅ Strong |

### 7.2 Areas Where Platform Has MODERATE Liability (Partially Protected)

| Risk | Current Protection | Gap | Recommendation |
|---|---|---|---|
| **Customer data breach** | Firebase encryption at rest, access controls, breach notification clause in terms | No formal incident response plan documented; no Data Protection Impact Assessment (DPIA); no data breach notification procedure for customers | Create formal DPIA + incident response plan + customer notification template |
| **GPS tracking consent** | Terms disclose GPS collection; "purged upon order completion" | No explicit opt-in consent mechanism for GPS before it's collected; users can decline to share GPS in their browser, but no in-app consent dialog | Consider adding granular GPS consent UI; ensure browser permission prompt is sufficient |
| **Analytics tracking** | Analytics beacon fires automatically on every page view | No cookie consent banner; no opt-out mechanism for analytics; Cookie Policy mentions a "Consent Management Platform" that may not actually exist yet | Implement actual cookie consent banner, especially for EU/GB users |
| **Customer data retention** | GPS/photos purge in 24h; but order history (name, plate, mobile) kept indefinitely | No defined retention period for order history; no automated deletion; privacy law may require defined retention | Define retention periods; implement automated data lifecycle management |
| **Cafe financial disputes** | Dashboard shows revenue split; terms define the split | No formal dispute resolution process for cafes; no SLA for platform uptime; no compensation for platform downtime causing lost orders | Add merchant SLA or uptime disclaimer; define dispute escalation path |
| **Chargebacks** | Terms say "cafe bears chargeback risk post-capture" | No process documented for helping cafes dispute chargebacks; no evidence package support | Create chargeback support process; cafe dashboard evidence exports |
| **Cross-border data** | Privacy policy mentions SCCs (EU/GB) and PIPEDA (CA) | SCCs may not actually be executed; no DPA template exists; no EU representative appointed | Execute SCCs if processing EU data; appoint EU/UK representative if required |

### 7.3 Areas Where Platform Has HIGH Liability (Needs Attention)

| Risk | Issue | Urgency | Recommendation |
|---|---|---|---|
| **No formal Acceptable Use Policy** | Referenced in legal checklist but not implemented as a standalone document | High | Create and publish standalone AUP |
| **No Takedown/Notice Policy** | Required per IP protection playbook but not implemented | High | Create DMCA/takedown notice procedure |
| **No terms acceptance capture** | Customer can browse and potentially order without explicitly accepting terms | Critical | Implement checkbox or click-through terms acceptance before first order; store timestamp + version accepted |
| **No merchant terms acceptance** | Cafe signs up but may not explicitly accept Merchant Partner Agreement | Critical | Require explicit acceptance of Merchant Agreement during onboarding with stored timestamp |
| **No version tracking of terms** | Terms are inline in code; no version number or changelog | High | Add version numbers, effective dates, changelog; store which version each user accepted |
| **Physical product liability (merch)** | Founders Cap sold via Stripe; fulfilled via Printful; no product liability clause specific to merchandise | Medium | Add merch-specific terms; Printful fulfillment means less liability, but consumer law still applies |
| **Alcohol / restricted items** | No restriction preventing cafes from listing alcohol or restricted items on their menu | Medium | Add prohibited items list to Merchant Agreement; implement content moderation if needed |
| **Employee misclassification (affiliates)** | Affiliate structure is well-documented as independent contractor, BUT in some jurisdictions (especially US/CA), the line between IC and employee can be legally challenged if the platform exerts too much control | Low (currently) | Document that affiliates have full autonomy in how they promote; no mandatory hours, tools, or methods |
| **GST/VAT registration** | Terms state "prices include GST where applicable" and platform is described as "GST-registered" — is Pull Up Coffee Pty Ltd actually GST-registered? | Critical | Verify GST registration status; if not registered and turnover exceeds $75K, mandatory registration required; if claiming GST inclusion in prices, must be registered |
| **Unfair Contract Terms (ACL)** | Several clauses may be considered "unfair" under Australian Consumer Law s.23-28, particularly: $50 liability cap, assumption of risk, binding arbitration (US) on standard form consumer contracts | High | Get lawyer to review all clauses against ACL unfair contract term provisions; ensure consumer guarantees are not excluded or limited improperly |

---

## 8. INSURANCE REQUIREMENTS

### 8.1 Platform Insurance Needs

| Insurance Type | Why It's Needed | Estimated Cost | Priority |
|---|---|---|---|
| **Professional Indemnity** | Covers claims arising from platform errors, advice, or omissions (e.g., payment processing failure causes cafe to lose money) | $500-$2,000/year | Critical |
| **Public Liability** | Covers third-party injury or property damage claims (e.g., customer claims they were burned by hot coffee received via platform) | $500-$1,500/year | Critical |
| **Cyber Insurance** | Covers data breach response costs, notification costs, regulatory fines, business interruption from cyber events | $1,000-$5,000/year | High |
| **Directors & Officers (D&O)** | Protects founder/directors from personal liability in legal actions against the company | $500-$2,000/year | High |
| **Product Liability (merch)** | Covers claims from merchandise (Founders Cap) — defective product, injury from product | $300-$800/year | Medium |
| **Business Interruption** | Covers loss of income if platform is down due to insured event | $300-$1,000/year | Medium |

### 8.2 Cafe Insurance Requirements (Already in Terms)
| Insurance | Minimum Coverage (per terms) | Region |
|---|---|---|
| Public & Product Liability | $10,000,000 | AU |
| Public & Product Liability | $2,000,000 USD | US |
| Public & Product Liability | £5,000,000 | GB |
| Public & Product Liability | $5,000,000 NZD | NZ |
| Public & Product Liability | $5,000,000 CAD | CA |
| Public & Product Liability | €5,000,000 | EU |
| Public & Product Liability | $10,000,000 AUD | International/Other |

**Gap:** Terms state insurance is "recommended" — consider whether it should be a **mandatory** requirement with proof of coverage before onboarding is completed. Currently, there is no verification that cafes actually hold this insurance.

---

## 9. INTELLECTUAL PROPERTY POSITION

### 9.1 Current IP Assets
| Asset | Protection | Status |
|---|---|---|
| **"Pull Up Coffee" word mark** | Trade Marks Act 1995 filing | ⚠️ Verify if TM application has been filed |
| **Pull Up Coffee logo** | Trade Marks Act 1995 filing | ⚠️ Verify if TM application has been filed |
| **Platform source code** | Copyright Act 1968 (automatic) | ✅ Protected; SHA-256 evidence preserved |
| **UI/UX designs** | Copyright Act 1968 (automatic) | ✅ Protected |
| **Business logic / algorithms** | Not patentable in AU (methods of doing business excluded), but protectable as trade secrets | ✅ Confidentiality clauses in terms |
| **Domain: pullupcoffee.com** | Domain registration | ✅ Registered |
| **Domain: pullupcoffee.com.au** | Domain registration | ⚠️ Verify if registered (playbook recommends defensive registration) |
| **Operational playbooks / pricing logic** | Trade secrets + confidentiality clauses | ✅ Referenced in terms |

### 9.2 IP Assignment Chain
| Link | Status |
|---|---|
| Founder → Company IP assignment | ⚠️ Verify if executed (required for pre-incorporation work) |
| Contractor IP assignments | ⚠️ Verify if any contractors contributed and have signed assignments |
| Moral rights consents | ⚠️ Verify if obtained from any contributors |
| AI-generated code ownership | ⚠️ Ambiguous — code generated with AI assistance may have ownership questions in some jurisdictions |

### 9.3 Prior Art Claims
The IP notice claims novel functionality for:
1. Dynamic curbside fee adjustment
2. Authorization-hold-before-preparation payment flow
3. GPS-based curbside arrival notification
4. Late arrival forfeiture logic
5. "I'm Outside" manual override
6. Looping audible merchant alerts
7. Favourites-based SMS opt-in opening notifications
8. Pass-through processing fee transparency

**Question for lawyer:** Are any of these genuinely novel enough to claim prior art? Could a competitor replicate these features without infringing? The evidentiary record (GitHub commits, SHA-256 hashes, WIPO Proof) is strong, but the underlying concepts may not be protectable.

---

## 10. REGULATORY COMPLIANCE BY JURISDICTION

### 10.1 Australia (Primary Market)

| Regulation | Compliance Status | Notes |
|---|---|---|
| **Privacy Act 1988 (APP)** | ✅ Partially compliant | Privacy Policy exists; data collection disclosed; GPS purge implemented. GAP: No formal APP-aligned privacy management plan; no Privacy Impact Assessment |
| **Australian Consumer Law (ACL)** | ✅ Partially compliant | Consumer guarantees preserved; refund language exists. GAP: Unfair contract terms review needed; $50 liability cap may be challenged |
| **Spam Act 2003** | ✅ Compliant | SMS only sent for transactional purposes (order notifications) or with consent (cafe opening alerts via favourites opt-in); unsubscribe mechanism via favourites removal |
| **Competition and Consumer Act 2010** | ✅ Partially compliant | Pricing is transparent; no misleading conduct. GAP: Revenue split representations must be accurate and not misleading |
| **GST Act 1999** | ⚠️ Verify | Terms reference GST registration — must verify actual registration status |
| **Food Standards Code** | ✅ Not applicable | Platform does not handle food; obligation falls to cafe |
| **Payment Systems Regulation** | ✅ Compliant | Using Stripe (licensed payment facilitator); platform is not a payment service provider |
| **Electronic Transactions Act 1999** | ✅ Compliant | Electronic agreements, digital signatures accepted |

### 10.2 United States (Planned Market)

| Regulation | Compliance Status | Notes |
|---|---|---|
| **CCPA/CPRA (California)** | ✅ Partially compliant | "Do Not Sell" disclosure exists; opt-out mechanism referenced. GAP: Need actual "Do Not Sell" link in UI; privacy rights request workflow |
| **FTC Act / Endorsement Guides** | ✅ Compliant (for affiliates) | Disclosure requirements specified per region |
| **CAN-SPAM** | ✅ Compliant | Email communications are transactional; commercial emails would need unsubscribe |
| **State food safety laws** | ✅ Not applicable | Platform does not handle food |
| **ADA (accessibility)** | ⚠️ Unknown | Web accessibility compliance not audited; could be exposure point for US-based users |
| **Arbitration clause** | ⚠️ Review needed | US terms include binding AAA arbitration + class action waiver — enforceable in most states but check state-specific limitations |

### 10.3 European Union (Planned Market)

| Regulation | Compliance Status | Notes |
|---|---|---|
| **GDPR** | ✅ Partially compliant | Legal bases stated; DPO contact provided; data rights listed. GAPS: No DPIA; no Article 27 EU representative appointed; no data processing register (Article 30); SCCs may not be executed |
| **ePrivacy Directive** | ⚠️ Gap | Cookie consent banner required but may not be implemented; Consent Management Platform referenced but may not exist |
| **Digital Services Act** | ⚠️ Assess | As a marketplace platform, may have obligations under DSA depending on user count |
| **Consumer Rights Directive** | ✅ Compliant | Right of withdrawal, pre-contractual information provided |

### 10.4 United Kingdom, New Zealand, Canada
Similar coverage to AU/EU with region-specific adjustments already coded in `REGION_CONFIG`. Key gap across all: actual implementation of consent mechanisms vs just having the legal text.

---

## 11. GAPS & MISSING PROTECTIONS

### 11.1 Critical Gaps (Fix Before Launch / ASAP)

| # | Gap | Risk if Not Fixed | Effort to Fix |
|---|---|---|---|
| 1 | **No terms acceptance capture** — no stored record of user accepting ToS version + timestamp | Terms may be unenforceable; no proof user agreed | Medium — add checkbox + Firestore write |
| 2 | **No merchant agreement acceptance** — same issue for cafe partners | Merchant Agreement may be unenforceable | Medium — add acceptance step in onboarding |
| 3 | **Cookie consent banner missing** — legally required in EU/GB; good practice everywhere | GDPR/PECR fine risk; ePrivacy non-compliance | Medium — implement banner component |
| 4 | **GST registration status unverified** — if claiming GST in prices, must be registered | Tax compliance breach; ATO penalty risk | Quick — verify with accountant |
| 5 | **No Acceptable Use Policy (standalone)** — referenced in checklist but not published | Weaker enforcement position against bad actors | Low — create AUP document |
| 6 | **No Takedown/Notice Policy** — no DMCA/counter-notice procedure | Cannot efficiently handle IP complaints from third parties | Low — create notice procedure |

### 11.2 High-Priority Gaps (Fix Within 30 Days)

| # | Gap | Risk | Effort |
|---|---|---|---|
| 7 | **No Data Protection Impact Assessment (DPIA)** | GDPR Article 35 may require DPIA for GPS tracking at scale | Medium — document assessment |
| 8 | **No incident response plan** | Data breach → no defined process → regulatory penalty + reputational harm | Medium — create plan |
| 9 | **Unfair contract terms audit** | ACL s.23 — standard form consumer contracts with unfair terms may be void | Needs lawyer review |
| 10 | **No defined data retention periods** | Privacy law requires defined periods; "indefinite" storage of order history (name, plate, mobile) may breach data minimisation principle | Medium — define periods + implement cleanup |
| 11 | **No data subject access request (DSAR) workflow** | Users have right to request data access/deletion; currently just "email us" — no SLA or process | Medium — create DSAR process with response timeline |
| 12 | **Insurance not verified for cafes** | Terms require insurance but there's no verification step — if a cafe doesn't have insurance and a customer gets hurt, the indemnification may be worthless | Medium — add insurance proof upload or declaration |
| 13 | **Terms version control** | If terms change, no mechanism to notify users or require re-acceptance | Medium — implement version tracking + change notification |

### 11.3 Medium-Priority Gaps (Fix Within 90 Days)

| # | Gap | Risk | Effort |
|---|---|---|---|
| 14 | **No age restriction** | No minimum age verification; minors could place orders and enter contracts | Low — add age declaration checkbox |
| 15 | **No prohibited items policy** | Nothing preventing cafes from listing alcohol, tobacco, or restricted items | Low — add to Merchant Agreement |
| 16 | **No accessibility audit** | ADA/WCAG compliance unknown; US exposure | High — accessibility audit + remediation |
| 17 | **No EU/UK representative** | GDPR Article 27 requires a representative in EU/UK if processing significant data | Medium — appoint representative or assess if required |
| 18 | **Merch terms** | No specific terms for merchandise sales (returns, defects, consumer guarantees) | Low — add to existing terms |
| 19 | **AI-generated code IP clarity** | Code developed with AI assistance — ownership may be ambiguous | Needs lawyer opinion |
| 20 | **Donation transparency** | "Support the Founder" donations — ensure compliance with fundraising laws (not tax-deductible, not charitable) | Low — add disclosure text |

---

## 12. RECOMMENDATIONS FOR LEGAL COUNSEL

### 12.1 Immediate Actions for Lawyer to Review

1. **Review all consumer-facing terms** (19 clauses) against Australian Consumer Law unfair contract term provisions (s.23-28). Particular focus on:
   - $50 / 12-month liability cap (is this "unfair" for a standard form consumer contract?)
   - Assumption of risk clause
   - US binding arbitration + class action waiver
   - Force majeure scope

2. **Review Merchant Partner Agreement** — is the indemnification clause enforceable? Does the insurance "recommendation" need to become a "requirement"? Is the 7-day termination clause sufficient?

3. **Review affiliate structure** against employee misclassification risk in each target jurisdiction (AU: sham contracting laws under Fair Work Act; US: ABC test / economic reality test; UK: IR35)

4. **Verify GST registration** — platform references GST in pricing; ensure entity is actually registered; if not yet at $75K threshold, remove GST claims from pricing

5. **Advise on AI-generated code ownership** — significant portions of code developed with AI assistance; what is the IP position under Australian copyright law? Is there any risk the code is not fully owned by the founder/company?

6. **Review privacy compliance** — is the current Privacy Policy sufficient for APP compliance? Does the legitimate interest basis apply in AU (APPs don't use GDPR-style "legal bases" in the same way)? Should the privacy policy differentiate between AU-style APPs and GDPR-style legal bases more clearly?

### 12.2 Documents to Create

| Document | Purpose | Priority |
|---|---|---|
| **Acceptable Use Policy** | Define prohibited platform uses; strengthen enforcement | High |
| **Takedown/Notice Policy** | DMCA-style notice procedure for IP complaints | High |
| **Data Protection Impact Assessment** | GDPR Article 35 compliance for GPS tracking + analytics | High |
| **Incident Response Plan** | Defined process for data breaches, system outages, fraud | High |
| **Data Subject Access Request SOP** | Standardised process for access/deletion requests with SLA | High |
| **Merchandise Terms & Conditions** | Consumer protections for physical product sales | Medium |
| **Data Processing Agreement (DPA)** | Template for enterprise/high-volume cafe partners | Medium |
| **Formal Privacy Management Plan** | Australian Privacy Principle-aligned internal procedures | Medium |

### 12.3 Code Changes Needed After Legal Review

Once the lawyer provides feedback, the following areas of the codebase will need updating:

| Change | Location in Code | Effort |
|---|---|---|
| Add terms acceptance checkbox + storage | `app/page.tsx` (checkout flow + signup flow) | Medium |
| Add terms version tracking | `app/page.tsx` + Firestore schema | Medium |
| Add cookie consent banner | `app/page.tsx` or `app/layout.tsx` (new component) | Medium |
| Add age verification checkbox | `app/page.tsx` (signup/checkout) | Low |
| Add prohibited items clause to merchant terms | `app/page.tsx` (merchant agreement section) | Low |
| Add merch-specific terms | `app/page.tsx` or new component | Low |
| Implement DSAR request form | New component or email-based workflow | Medium |
| Add insurance declaration/upload to cafe onboarding | `app/page.tsx` (signup flow) + new Firestore field | Medium |
| Update privacy policy if lawyer recommends changes | `app/page.tsx` (privacy tab) | Low |
| Update unfair contract term clauses if flagged | `app/page.tsx` (terms tab) | Low-Medium |

---

## 13. WHERE LEGAL CONTENT LIVES ON THE WEBSITE

### 13.1 Current Legal Content Placement
| Content | Location on Website | How Users Access It |
|---|---|---|
| Full Terms + Privacy + Cookies + Affiliate + IP | Legal Modal (tabbed) | Footer link "Terms & Privacy" |
| Static Terms & Liability (7 clauses) | TermsModal (simpler version) | Footer link or pre-checkout |
| Customer Support / Refund Disclaimer | CustomerSupportModal | "Issue with Order?" button during active order |
| FAQ with Data Deletion Info | Legal Modal → FAQ tab | Footer link → FAQ tab |
| Early Adopter Notice | Signup page | Inline during cafe registration |
| Curbside Fee Explanation | Cafe Settings page | Cafe dashboard → Account/Settings tab |
| Revenue Split Details | Cafe Order History | Cafe dashboard → order detail view |

### 13.2 Recommended Additional Placement
| Content | Where to Add | Why |
|---|---|---|
| Terms acceptance checkbox | Before first order AND during cafe signup | Enforce agreement; store acceptance record |
| Cookie consent banner | Global — appears on every page for first-time visitors (EU/GB minimum) | GDPR/PECR compliance |
| Age verification | During account creation or first checkout | Legal capacity to contract |
| Acceptable Use Policy link | Footer (alongside existing legal links) | Discoverability |
| Takedown/Notice procedure | Footer or within IP notice section | DMCA compliance |
| Insurance declaration | Cafe onboarding flow (after account creation, before going live) | Risk mitigation |
| Merch terms | Checkout page for merchandise purchases | Consumer law compliance |
| "Do Not Sell" link | Footer (US users) or privacy settings | CCPA compliance |

---

## APPENDIX: FIRESTORE COLLECTIONS & DATA SCHEMA

### Collections Used
| Collection | Contains | Sensitivity |
|---|---|---|
| `cafes` | Business profiles, Stripe IDs, menu items, settings | High — business PII |
| `orders` | Customer PII (name, mobile, plate, GPS, car photo), order details, payment intent IDs | High — customer PII + financial |
| `affiliates` | Affiliate PII (name, email, phone), referral codes | Medium — personal data |
| `affiliate_commissions` | Commission amounts, order references, timestamps | Medium — financial data |
| `favorites` | Customer-cafe relationships for notification opt-in | Low — relationship data |
| `support_tickets` | Customer messages, cafe IDs, timestamps | Medium — may contain PII |
| `merch_purchases` | Purchase amount, tier, timestamp, session ID | Medium — financial data |
| `site_analytics` | IP (country only via Vercel header), device/browser/OS, paths, referrers, session IDs | Low-Medium — pseudonymised |
| `security_events` | IP addresses, countries, user agents, event types, severity | Medium — security data |

### Firebase Security Rules
⚠️ **Not audited in this document.** Security rules should be reviewed separately to ensure:
- Customers can only read their own orders
- Cafes can only read/write their own profile and orders
- Admin access properly restricted
- No public read/write on sensitive collections

### Third-Party Data Processors
| Processor | Data Shared | Purpose | DPA Status |
|---|---|---|---|
| **Stripe** | Customer payment data, cafe business data | Payment processing | Stripe DPA applies automatically |
| **Firebase / Google Cloud** | All Firestore data | Database, auth, hosting | Google Cloud DPA available |
| **Twilio** | Customer & cafe mobile numbers, message content | SMS notifications | Twilio DPA available |
| **Resend** | Email addresses, notification content | Email notifications | Check Resend DPA |
| **Vercel** | Request logs, IP addresses | Hosting, serverless functions | Vercel DPA available |
| **Printful** | Shipping addresses (merch only) | Merchandise fulfillment | Check Printful DPA |

---

*This document is for legal review purposes. It describes the technical and legal architecture of the Pull Up Coffee platform as of March 2026. It is not legal advice. All recommendations should be reviewed and validated by qualified legal counsel before implementation.*
