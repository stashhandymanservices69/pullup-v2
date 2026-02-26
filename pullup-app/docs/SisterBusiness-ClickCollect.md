# Pull Up Sister Business - Universal Click & Collect Drive-Through Platform

## Domain Name Recommendations

### Top Recommendations (Available as of Feb 2026)
1. **PullUpStore.com.au** ⭐ BEST
   - Clear, memorable, aligns with Pull Up brand
   - Works for all retail categories
   - Strong SEO potential

2. **CurbsideClick.com.au**
   - Descriptive, explains the service immediately
   - Professional, enterprise-ready
   - Good for retail partnerships

3. **DrivePickup.com.au**
   - Action-oriented, self-explanatory
   - Works globally (not AU-only branding)
   - Catchy, easy to remember

4. **KerbClick.com.au**
   - Australian spelling of "curb"
   - Short, punchy
   - Unique branding angle

5. **SnapCollect.com.au**
   - Modern, fast-sounding
   - Emphasizes speed and convenience
   - Appeals to younger demographics

### Alternative Options
- **ClickCurbside.com.au**
- **DriveCollect.com.au**
- **QuickKerb.com.au**
- **ParkAndPick.com.au**
- **StopAndShop.com.au**

---

## Business Model Summary

### What Is It?
Universal drive-through click & collect platform for **ANY retail business**:
- Clothing stores
- Hardware stores
- Pharmacies
- Liquor stores
- Book shops
- Electronics retailers
- Pet stores
- Florists
- Gift shops
- Bars/pubs (takeaway alcohol, products)

### How It Works
1. Customer browses business catalog from car
2. Customer places order & pays online
3. Business receives notification & prepares order
4. Customer arrives curbside
5. Staff brings order to car
6. **No need to enter store** - perfect for accessibility, convenience, time-poor customers

---

## Key Differentiators vs Competitors

### Learning from Woolworths/Coles Click & Collect:
**What They Do Well:**
- ✅ Time slot booking system
- ✅ Clear "parked & ready" notification button
- ✅ Real-time inventory updates
- ✅ Substitution options for out-of-stock items
- ✅ Order history & favorites
- ✅ Photo-based product catalog

**What We'll Do BETTER:**
- 🚀 **No Apps Required** - works instantly via web browser/QR
- 🚀 **No Time Slots** - on-demand, order when you arrive
- 🚀 **Faster Setup** - businesses go live in 30 minutes vs weeks
- 🚀 **Accessible to SMBs** - not just corporate chains
- 🚀 **Lower Fees** - 20% service fee vs 30%+ for delivery apps
- 🚀 **GPS-Based Arrival** - no parking bay numbers needed

---

## Technical Implementation

### Shared Codebase Strategy
- **Same tech stack** as Pull Up Coffee (Next.js, Firebase, Stripe)
- **Separate Firebase project** for data isolation
- **Shared UI components** (90% code reuse)
- **Different branding** (colors, logo, copy)

### Key Code Changes Needed:
1. **Menu → Catalog**: Rename "menu" to "product catalog"
2. **Item Sizes**: Support S/M/L/XL for clothing, multiple variants
3. **Stock Management**: Add inventory tracking (optional)
4. **Photo Upload**: Allow multiple product photos
5. **Categories**: Electronics, Clothing, Hardware, etc. (vs Coffee items)
6. **No Curbside Add-ons**: Remove milk/syrup/shots (cafe-specific)

---

## Cross-Promotion Strategy

### Pull Up Coffee Points to Sister Business
Add section in cafe merchant portal:
> "Don't sell coffee? We have a sister platform for all other retail businesses!  
> **Visit PullUpStore.com.au** to list your clothing/hardware/liquor/pharmacy business."

**Implementation:**
- Add banner in CafeDashboard under "Operations" tab
- Link: `<a href="https://pullupstore.com.au?ref=coffee">Launch Your Drive-Through Store →</a>`

### Sister Business Points to Pull Up Coffee
Add section in store merchant portal:
> "Looking for cafe-specific features?  
> **Visit PullUpCoffee.com.au** for coffee shops with milk/syrup add-ons."

---

## Business Card Design Concept

### Front Side (Split QR Design)
```
┌───────────────────────────────┐
│                               │
│      PULL UP SERVICES         │
│   Drive-Through Made Easy     │
│                               │
│  ┌─────────┐    ┌─────────┐  │
│  │ QR-CAFE │    │ QR-STORE│  │
│  │  CODE   │    │  CODE   │  │
│  └─────────┘    └─────────┘  │
│   Coffee &       All Other    │
│   Cafes          Retail       │
│                               │
│  PullUpCoffee.com.au          │
│  PullUpStore.com.au           │
│                               │
└───────────────────────────────┘
```

### Back Side (Affiliate Program)
```
┌───────────────────────────────┐
│                               │
│   💰 EARN 25% COMMISSION      │
│                               │
│  Refer businesses & earn      │
│  25% of platform fees for     │
│  their first 30 days.         │
│                               │
│  Contact:                     │
│  hello@pullupcoffee.com.au    │
│                               │
│  ABN: 17 587 686 972          │
│                               │
└───────────────────────────────┘
```

---

## Recommended Business Card Printing Services (Australia)

### 1. **Vistaprint Australia** (vistaprint.com.au)
- **Price:** 500 cards from $15-30
- **Quality:** Good for budget, fast turnaround
- **Delivery:** 3-5 business days standard
- **Custom:** Full customization, split QR layout supported

### 2. **MOO Australia** (moo.com/au)
- **Price:** 50 premium cards from $30
- **Quality:** EXCELLENT (thick, luxe finish)
- **Delivery:** 7-10 business days
- **Custom:** High-end design tools, NFC option

### 3. **Officeworks** (officeworks.com.au)
- **Price:** 250 cards from $25
- **Quality:** Standard commercial grade
- **Delivery:** Same-day pickup available in stores
- **Custom:** Basic design templates, quick turnaround

### 4. **Snap Print** (snap.com.au)
- **Price:** 500 cards from $40
- **Quality:** Professional, various finishes (matte/gloss)
- **Delivery:** 2-3 days
- **Local:** Australian-owned, 100+ stores nationwide

### **RECOMMENDATION for Your Use Case:**
**Use MOO Australia** for initial 200 high-quality cards to hand to postmen/businesses. The premium feel builds trust. Once proven, bulk order

 5,000 from Vistaprint for $150 for wider distribution.

---

## Australia Post Distribution Strategy

### Legal Considerations:
- ✅ Post workers CAN distribute non-addressed promotional material **if it's not considered junk mail**
- ✅ Better approach: Ask postmen to **hand cards directly to business owners** during their rounds
- ✅ Offer small incentive: "$20 per cafe signed up through your card" (tracks via unique QR)

### How to Approach Postmen:
1. Contact your local Australia Post depot manager
2. Explain you're a local tech startup helping small businesses
3. Offer business cards they can hand out to cafe/store owners on their routes
4. Provide unique QR codes per postman to track referrals
5. Pay $20 commission for every business that signs up via their card

### Tracking Referrals:
- Generate unique URLs: `pullupcoffee.com.au?ref=postman_john`
- Store referral code in Firebase on signup
- Monthly payout report: "Postman John referred 3 cafes = $60 commission"

---

## Launch Checklist - Sister Business

### Before Launch:
- [ ] Register domain (PullUpStore.com.au or chosen name)
- [ ] Clone Pull Up Coffee codebase to new repo
- [ ] Set up separate Firebase project (authentication, Firestore, hosting)
- [ ] Rebrand UI: Change colors (e.g., blue instead of orange), logo, copy
- [ ] Update terminology: Menu → Catalog, Cafe → Store, Coffee → Products
- [ ] Add product variant support (sizes, colors)
- [ ] Test end-to-end order flow
- [ ] Create demo store account for testing
- [ ] Write Terms of Service (copy from cafe, adjust for general retail)
- [ ] Set up Stripe Connect for new legal entity (or use same account with separate routing)

### Launch Week:
- [ ] Deploy to Firebase Hosting under new domain
- [ ] Test on mobile (90% of traffic will be mobile)
- [ ] Create 10 flyers/posters for local retailers
- [ ] Visit 5 hardware stores, 5 pharmacies, 5 liquor stores to demo in person
- [ ] Create Facebook/Instagram page for brand
- [ ] Post in local business Facebook groups
- [ ] Email 50 local businesses with pitch deck

---

## Integration with Pull Up Coffee

### Shared Infrastructure:
- Same codebase (90% shared)
- Separate domains
- Separate Firebase projects (data isolation)
- Separate Stripe accounts (or same account, different metadata)

### Code Structure:
```
/pullup-platform
  /pullup-coffee (existing)
  /pullup-store (new - clone and modify)
  /shared (shared components, utils)
```

### Environment Variables:
```
# Pull Up Coffee (.env.local)
NEXT_PUBLIC_BRAND=coffee
NEXT_PUBLIC_PRIMARY_COLOR=#f97316
NEXT_PUBLIC_FIREBASE_PROJECT=pullup-coffee-prod

# Pull Up Store (.env.local)
NEXT_PUBLIC_BRAND=store
NEXT_PUBLIC_PRIMARY_COLOR=#3b82f6
NEXT_PUBLIC_FIREBASE_PROJECT=pullup-store-prod
```

---

## Revenue Projection

### Assumptions:
- 50 stores sign up in first 6 months
- Each store averages 20 orders/week
- Average order value: $30
- 20% service fee on curbside convenience fee ($3 minimum)

**Monthly Revenue (Month 6):**
- 50 stores × 20 orders/week × 4.33 weeks = 4,330 orders/month
- 4,330 orders × $0.60 platform fee (20% of $3) = $2,598/month
- **Annualized: ~$31,000/year from sister business alone**

**Combined (Coffee + Store):**
- 100 cafes + 50 stores = 150 businesses total
- Projected Year 1 revenue: **$80,000-100,000** from both platforms

---

## Competitive Advantage

### Why Businesses Will Choose Us:
1. **Speed**: Live in 30 minutes vs weeks for Square/Shopify
2. **Cost**: 20% service fee vs 30% for DoorDash/Uber
3. **Accessibility**: No app download required
4. **Simplicity**: QR code = instant storefront
5. **SMB-Focused**: Built for indie retailers, not just chains
6. **Australian**: Local support, Australian banking, ACCC-compliant

### Why Customers Will Use It:
1. **Convenience**: Order from car, no parking/walking
2. **Accessibility**: Perfect for mobility-impaired, parents with babies
3. **Fast**: No queues, no crowds
4. **Safe**: Less contact, private transaction
5. **Weather**: Order in rain/heat without getting out

---

## Next Steps (This Week)

### Wednesday (Today):
- [x] Finalize domain name choice
- [ ] Register domain via Crazy Domains or Namecheap
- [ ] Clone Pull Up Coffee repo
- [ ] Rebrand for "store" version (colors, logo, copy)

### Thursday:
- [ ] Deploy sister business to separate Firebase project
- [ ] Test full order flow
- [ ] Design business cards (MOO template)
- [ ] Order 200 business cards (express shipping)

### Friday (Launch Day):
- [ ] Go live with Pull Up Coffee (primary focus)
- [ ] Soft launch Pull Up Store (mention in coffee onboarding)
- [ ] Hand out 20 business cards to local retailers
- [ ] Post on LinkedIn/Facebook about both platforms

---

## Long-Term Vision

### Year 1: Prove Concept
- 100 cafes + 50 stores
- $80k-100k revenue
- Break-even on operating costs

### Year 2: Scale & Specialize
- Add industry-specific features (pharmacy scripts, liquor ID checking, hardware booking)
- White-label option for larger retailers ($500/month flat fee)
- Expand to NZ, UK

### Year 3: Exit or IPO
- 2,000+ businesses across both platforms
- $2-3M annual revenue
- Acquisition target for Square, Shopify, or listed company
- OR: Remain independent, pay yourself $150k/year salary

---

**Recommended Domain:** **PullUpStore.com.au**  
**Recommended Card Printer:** **MOO Australia (premium) + Vistaprint (bulk)**  
**Launch Timeline:** Soft launch by Friday, aggressive marketing Week 2

🚀 Let's make the drive-through the default shopping experience!
