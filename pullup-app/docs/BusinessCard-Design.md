# Pull Up Business Card - Design Specifications

**Goal:** Professional dual-QR business card promoting both Pull Up Coffee and Pull Up Store with affiliate tracking

---

## Card Specifications

### Physical Dimensions
- **Size:** 90mm × 55mm (standard Australian business card)
- **Orientation:** Horizontal (landscape)
- **Bleed:** Add 3mm bleed on all sides (final template: 96mm × 61mm)
- **Safe Zone:** Keep important elements 3mm from trim edges
- **Resolution:** 300 DPI minimum
- **Color Mode:** CMYK (for printing)
- **File Format:** PDF with embedded fonts

---

## Front Side Design

### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│  PULL UP SERVICES                          [Logo]   │
│  Drive-Through Made Easy                            │
│                                                      │
│  ┌──────────┐              ┌──────────┐           │
│  │          │               │          │            │
│  │  Coffee  │               │  Store   │            │
│  │  QR Code │               │  QR Code │            │
│  │          │               │          │            │
│  └──────────┘              └──────────┘            │
│                                                      │
│  pullupcoffee.com.au    pullupstore.com.au          │
└─────────────────────────────────────────────────────┘
```

### Design Elements

**Header (Top Left):**
- Text: "PULL UP SERVICES"
- Font: Bold sans-serif (e.g., Montserrat Bold, Helvetica Bold)
- Size: 16pt
- Color: #2c3e50 (dark gray)

**Tagline (Below Header):**
- Text: "Drive-Through Made Easy"
- Font: Regular sans-serif (Montserrat Regular)
- Size: 10pt
- Color: #7f8c8d (medium gray)

**Logo (Top Right):**
- Pull Up logo icon (car + coffee cup silhouette)
- Size: 20mm × 20mm
- Color: #16a34a (green) or full color if available

**QR Codes (Center):**
- **Left QR Code:**
  - Label above: "Coffee & Cafes"
  - Size: 25mm × 25mm
  - URL: `https://pullupcoffee.com.au?ref=card`
  - Label font: 9pt regular
  - Color: Black QR on white background

- **Right QR Code:**
  - Label above: "All Other Retail"
  - Size: 25mm × 25mm
  - URL: `https://pullupstore.com.au?ref=card`
  - Label font: 9pt regular
  - Color: Black QR on white background

**Domain Names (Bottom):**
- Text: "pullupcoffee.com.au    pullupstore.com.au"
- Font: 8pt regular
- Color: #7f8c8d
- Center aligned

**Background:**
- White (#FFFFFF)
- Optional: Subtle gradient from white to light gray (#f8f9fa) top to bottom

---

## Back Side Design

### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│                       💰                             │
│           EARN 25% COMMISSION                        │
│                                                      │
│  Refer businesses to Pull Up and earn:               │
│  • 25% of platform fees for 30 days                 │
│  • $0.60 per order (avg $18/cafe/month)            │
│  • Passive income - we handle everything            │
│                                                      │
│  Your unique referral code:                          │
│  ┌─────────────────────────────┐                   │
│  │   [Handwritten space]        │                   │
│  └─────────────────────────────┘                   │
│                                                      │
│  📧 hello@pullupcoffee.com.au                       │
│  🏢 ABN 17 587 686 972                              │
└─────────────────────────────────────────────────────┘
```

### Design Elements

**Emoji Header:**
- Icon: 💰 (money bag)
- Size: 18pt
- Color: System emoji (full color)

**Main Headline:**
- Text: "EARN 25% COMMISSION"
- Font: Bold sans-serif
- Size: 14pt
- Color: #16a34a (green to match brand)
- Center aligned

**Body Text:**
- Font: Regular sans-serif
- Size: 9pt
- Color: #2c3e50
- Left aligned
- Line spacing: 1.4

**Referral Code Box:**
- Label: "Your unique referral code:"
- Box: White background with dashed border
- Size: 40mm × 8mm
- Border: 1pt dashed #7f8c8d
- Purpose: Handwrite or print custom code per person

**Footer Contact Info:**
- Email: hello@pullupcoffee.com.au
- ABN: 17 587 686 972
- Font: 8pt regular
- Color: #7f8c8d
- Left aligned
- Icon emojis: 📧 🏢 (8pt)

**Background:**
- White (#FFFFFF)
- Optional: Very light green tint (#f0fdf4) to distinguish from front

---

## QR Code Generation Instructions

### Step 1: Create QR Codes with Tracking
Use [QR Code Generator](https://www.qr-code-generator.com/) or API:

**Coffee QR Code:**
```
URL: https://pullupcoffee.com.au?ref=card
Format: PNG
Size: 1000px × 1000px (will scale down)
Error Correction: Medium (15%)
```

**Store QR Code (Future):**
```
URL: https://pullupstore.com.au?ref=card
Format: PNG
Size: 1000px × 1000px
Error Correction: Medium (15%)
```

**For Personalized Affiliate Cards:**
Replace `?ref=card` with `?ref=[firstname]` (e.g., `?ref=john` for John the postman)

### Step 2: Test QR Codes
- Scan with iPhone camera (native QR scanner)
- Scan with Android Chrome (point camera, link appears)
- Verify URL redirects correctly
- Check tracking parameter appears in Google Analytics

---

## Design Templates

### Option 1: Canva (Easiest)
1. Go to [Canva.com](https://www.canva.com/)
2. Create account (free)
3. Search templates: "Business Card 90x55mm"
4. Use custom dimensions: 90mm × 55mm
5. Add text, QR codes, logo
6. Download as PDF (Print quality)

**Canva Template Link (Create This):**
- [ ] Create template with layout above
- [ ] Share public link: canva.com/design/[template_id]
- [ ] Add to this document once created

### Option 2: Figma (Professional)
1. Go to [Figma.com](https://www.figma.com/)
2. Create new file
3. Set canvas: 96mm × 61mm (including bleed)
4. Add safe zones (guides 3mm from edges)
5. Design front and back as separate frames
6. Export: File → Export → PDF

**Figma Template Link (Create This):**
- [ ] Create template with layout above
- [ ] Share with "View only" access
- [ ] Add link: figma.com/file/[file_id]

### Option 3: Adobe Illustrator (Advanced)
1. New document: 96mm × 61mm, CMYK, 300 DPI
2. Set bleed: 3mm all sides
3. Create front and back artboards
4. Export: File → Export → PDF (Press Quality preset)

---

## Color Palette

### Primary Colors
- **Brand Green:** #16a34a (Pull Up primary)
- **Dark Gray:** #2c3e50 (headings)
- **Medium Gray:** #7f8c8d (body text)
- **Light Gray:** #f8f9fa (subtle backgrounds)
- **White:** #FFFFFF (main background)

### Accent Colors (Optional)
- **Success Green:** #10b981 (highlights)
- **Warning Yellow:** #f59e0b (call-to-action elements)
- **Info Blue:** #3b82f6 (links)

---

## Printing Services & Costs

### Option 1: MOO Australia ⭐ (Recommended for Quality)
**Why MOO?**
- Exceptional print quality (best color accuracy)
- Soft-touch matte finish (premium feel)
- Free design review (catch mistakes)
- Fast turnaround (7-10 business days)

**Pricing:**
- 50 cards: $29.99
- 100 cards: $39.99
- 200 cards: $59.99
- 500 cards: $129.99

**Order Process:**
1. Go to [moo.com/au](https://www.moo.com/au/)
2. Select "Business Cards" → Upload Your Own
3. Upload front PDF, back PDF
4. Choose finish: Soft-touch matte
5. Review proof carefully
6. Order (arrives in 7-10 days)

**Website:** https://www.moo.com/au/

---

### Option 2: Vistaprint (Best for Bulk)
**Why Vistaprint?**
- Cheapest per-unit cost at scale
- Frequent sales (50% off promotions)
- Decent quality (not premium but good)
- Fast production (5-7 business days)

**Pricing:**
- 100 cards: $15
- 500 cards: $35
- 1,000 cards: $55
- 5,000 cards: $150 (3¢ per card!)

**Order Process:**
1. Go to [vistaprint.com.au](https://www.vistaprint.com.au/)
2. Select "Business Cards" → Standard
3. Upload design
4. Choose finish: Matte or glossy
5. Select quantity
6. Wait for promo code (check email)

**Website:** https://www.vistaprint.com.au/

---

### Option 3: Officeworks (Same-Day Pickup)
**Why Officeworks?**
- Walk in today, pick up tomorrow
- No design review needed (print as-is)
- Cheap for small batches
- Convenient (stores everywhere)

**Pricing:**
- 100 cards: $25 (in-store print)
- 250 cards: $45
- 500 cards: $75

**Order Process:**
1. Visit [officeworks.com.au](https://www.officeworks.com.au/)
2. Select "Print & Copy" → Business Cards
3. Upload PDF (front and back)
4. Choose paper: 300gsm cardstock
5. Select quantity and pickup store
6. Collect next day (or same-day rush for +$10)

**Website:** https://www.officeworks.com.au/

---

### Option 4: Local Print Shop (Support Small Business)
**Why Local?**
- Personalized service
- Design help if needed
- Support local economy
- Can negotiate bulk discounts

**Find a Printer:**
- Google: "Business card printing near me"
- Visit with USB drive (PDF files)
- Request print samples before ordering
- Ask about bulk discounts (1,000+ cards)

**Expected Pricing:**
- 100-500 cards: $30-70
- Quality varies (request samples)

---

## Recommended Printing Strategy

### Phase 1: Test Batch (Week 1)
**Order:** 100 cards from Officeworks ($25)
**Purpose:** Test design, hand out to first contacts, iterate quickly
**Timeline:** Order Monday → Pick up Tuesday

### Phase 2: Quality Batch (Week 2-3)
**Order:** 200 cards from MOO Australia ($60)
**Purpose:** Impress key partners, distribute at networking events, premium feel
**Timeline:** Order Wednesday → Receive in 7-10 days

### Phase 3: Bulk Distribution (Month 2+)
**Order:** 5,000 cards from Vistaprint ($150 during sale)
**Purpose:** Mass distribution (Australia Post postmen, cafe counter displays, events)
**Timeline:** Order during 50% off promo → Receive in 5-7 days

**Total Investment:** $235 for 5,300 cards (~4¢ per card)

---

## Personalization Strategy

### Standard Card (Bulk Distribution)
- Referral code: "?ref=card" (generic tracking)
- Printed in bulk (5,000 units)
- Cost: 3¢ per card
- Use for: Cafe counters, events, cold distribution

### Personalized Affiliate Cards (VIP Partners)
**Who Gets Custom Cards?**
- Australia Post postmen (print 20 cards per postman)
- Key affiliates (friends, family who refer)
- Business partners (lawyers, accountants who network)

**Customization:**
- Referral code: "?ref=john" (person's first name)
- Handwrite in the box on back
- Or print small batches with pre-filled code

**Tracking Benefits:**
- Know exactly who referred each cafe
- Pay accurate commissions (25% for 30 days)
- Reward top performers (bonus for 5+ referrals)

**Cost:**
- MOO allows variable data printing ($10 extra for 200 cards)
- Or handwrite codes on standard cards (free)

---

## Distribution Channels

### 1. Hand Out Personally
**Where:**
- Local cafes (ask owner if you can chat for 2 minutes)
- Networking events (Chamber of Commerce, BNI)
- Business meetups (startup events, entrepreneur groups)
- Friends and family (ask them to refer businesses)

**Pitch:**
"Hey! I built this platform that helps cafes do drive-through orders without apps. Scan the QR code with your phone—it's super simple. If you know any cafe owners, I'd love an intro!"

### 2. Cafe Counter Displays
**Setup:**
- Print 50 cards for each approved cafe
- Ship with onboarding package (QR poster + business cards)
- Cafe displays at register (customers see it, tell friends)

**Call to Action:**
"Own a business? Scan here to join Pull Up!"

### 3. Australia Post Postmen (Genius Strategy!)
**Outreach:**
1. Contact local Australia Post depot manager
2. Pitch: "Your postmen visit 200 businesses daily. What if they could earn an extra $20 per signup?"
3. Offer: Each postman gets 50 cards with unique referral code
4. Commission: $20 flat fee per approved cafe (tracked via QR code)

**Why This Works:**
- Postmen are TRUSTED by business owners (perfect referrer)
- They visit the same businesses daily (repeat exposure)
- Extra income for postmen (win-win)
- Scalable (every suburb has postmen)

**Cost:**
- 50 postmen × 50 cards = 2,500 cards ($75 from Vistaprint)
- Commission: 3 cafes per postman × $20 = $60 per postman
- ROI: Acquire 150 cafes for $3,075 (~$20 per cafe acquisition cost)

### 4. Social Media (Free Distribution)
**Post Photo:**
- Hold business card in hand
- Caption: "Just got our Pull Up business cards! DM me if you want one 📬"
- Tag local cafes and businesses
- Offer to mail cards to interested businesses (3-5 per request)

**Cost:** $5 postage for 10 mailings = $0.50 per interested business

---

## Card Holder / Display Stand (Optional)

### Acrylic Business Card Holder
**Use Case:** Display stack of cards on cafe counters

**Product:** Desktop Business Card Holder
- **Size:** Holds 50-80 standard cards
- **Material:** Clear acrylic (professional look)
- **Cost:** $8-12 from Officeworks or Amazon

**Where to Place:**
- Cafe register counter (next to tip jar)
- Reception desks (co-working spaces)
- Networking event tables (your booth)

**Purchase Link:**
- Officeworks: Search "business card holder"
- Amazon AU: Search "acrylic business card stand"

---

## Quality Control Checklist

Before ordering 5,000 cards, verify:

- [ ] QR codes scan correctly on iPhone and Android
- [ ] URLs redirect to correct pages (pullupcoffee.com.au, pullupstore.com.au)
- [ ] Tracking parameter ?ref=card appears in Google Analytics
- [ ] All text is spelled correctly (no typos!)
- [ ] ABN is correct: 17 587 686 972
- [ ] Email is correct: hello@pullupcoffee.com.au
- [ ] Logo is high-resolution (not pixelated)
- [ ] Colors are in CMYK mode (not RGB)
- [ ] Bleed is added (3mm all sides)
- [ ] Safe zone respected (no text cut off at edges)
- [ ] File format is PDF (not PNG or JPG)
- [ ] Fonts are embedded (or converted to outlines)
- [ ] Print test batch (100 cards) looks good before bulk order

---

## Cost Summary

### Total Investment for 5,300 Cards
| Batch | Printer | Quantity | Cost | Purpose |
|-------|---------|----------|------|---------|
| Test | Officeworks | 100 | $25 | Quick iteration |
| Premium | MOO | 200 | $60 | First impressions |
| Bulk | Vistaprint | 5,000 | $150 | Mass distribution |
| **Total** | — | **5,300** | **$235** | **~$0.04 per card** |

### Additional Costs
- Acrylic card holders: $8 × 10 = $80 (for 10 cafes)
- Postage for mailings: $5 × 10 = $50 (mail to 10 interested businesses)
- **Grand Total:** $365

### Return on Investment
**If just 10 cafes sign up from cards:**
- 10 cafes × $18/month avg revenue = $180/month
- Break-even in 2 months
- ROI: Infinite after month 2

**Realistic Conversion:**
- 5,300 cards distributed
- 2% conversion rate = 106 cafes sign up
- 106 cafes × $18/month = $1,908/month revenue
- **That's 523% ROI in month 1!** 🚀

---

## Next Steps

### This Week (February 24-26)
1. [ ] Create Canva design using layout above
2. [ ] Generate QR codes with ?ref=card tracking
3. [ ] Order 100 test cards from Officeworks ($25)
4. [ ] Print PDF at home for immediate testing

### Next Week (March 3-7)
5. [ ] Receive test cards, distribute to 10 cafes
6. [ ] Get feedback, iterate design if needed
7. [ ] Order 200 premium cards from MOO ($60)
8. [ ] Hand out at networking events

### Month 2 (March 10+)
9. [ ] Wait for Vistaprint 50% off sale
10. [ ] Order 5,000 bulk cards ($150)
11. [ ] Contact Australia Post depot manager
12. [ ] Recruit 10 postmen with $20 commission offer
13. [ ] Distribute cards to 50 cafes (counter displays)

---

## Templates to Create

### Email Template: Request Custom Cards
**Subject:** Business Card Request - Pull Up Affiliate

**Body:**
```
Hi [Name],

Thanks for your interest in promoting Pull Up!

I'm sending you 50 business cards with your unique referral code [firstname].

How It Works:
1. Hand cards to cafe owners or business contacts
2. They scan the QR code and sign up
3. You earn 25% commission for 30 days (~$18 per cafe)

Your cards will arrive in 5-7 days.

Let me know if you have questions!

Cheers,
Steven
Founder, Pull Up Coffee
hello@pullupcoffee.com.au
```

---

### Social Post Template: Showing Off Cards
**Caption:**
```
Just got our new Pull Up business cards! 🚗☕

Two QR codes:
→ Left: Pull Up Coffee (drive-through for cafes)
→ Right: Pull Up Store (coming soon for retail)

If you own a cafe or retail business, scan the code and join!

DM me if you want a card for yourself 📬

#smallbusiness #startuplife #coffeelovers #australian startups
```

**Photo Idea:** Hold card in front of coffee cup, QR codes visible

---

## Design Inspiration

### Examples of Great Business Cards
1. **Moo Showcase:** [moo.com/au/inspiration](https://www.moo.com/au/inspiration)
2. **Pinterest:** Search "QR code business card design"
3. **Dribbble:** Search "modern business card"

### Key Design Principles
- **Less is More:** Don't cram too much info
- **White Space:** Let design breathe
- **Hierarchy:** Most important element = QR codes (biggest)
- **Contrast:** Dark text on white background (easy to read)
- **Consistency:** Match brand colors (green, gray, white)

---

## Tracking & Analytics

### Monitor QR Code Performance
**Google Analytics Dashboard:**
1. Go to Google Analytics
2. Acquisition → All Traffic → Source/Medium
3. Filter by: `?ref=card` (business cards)
4. Track:
   - How many scans?
   - How many signups?
   - Conversion rate (scans → signups)

**Optimize Based on Data:**
- If low scans: QR code too small, redesign
- If low conversions: Landing page needs work
- If high conversions: Print more cards!

### A/B Testing (Advanced)
**Test Two Designs:**
- Version A: Green header, playful emoji
- Version B: Minimalist black and white

**Order 100 of each:**
- Distribute equally (50 A, 50 B)
- Track: ?ref=cardA vs ?ref=cardB
- Analyze: Which version gets more signups?
- Print bulk of winner

---

**Created:** February 24, 2026  
**Last Updated:** February 24, 2026  
**Status:** Ready to print (create Canva template first)  
**Budget:** $235 for 5,300 cards (~4¢ each)  
**Expected ROI:** 106 cafes × $18/month = $1,908/month (523% ROI) 🎯
