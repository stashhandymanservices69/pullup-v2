# Pull Up Coffee - Daily Operational Monitoring Guide

**Goal:** Run the platform with minimal time investment while maintaining quality and catching problems early.

**Target Time Investment:** 30-60 minutes per day (once systems are proven)

---

## Daily Morning Routine (20-30 minutes)

### 1. Check New Cafe Applications (10 min)
**Location:** Firebase Console > Firestore > `cafes` collection

**Filter:**
```
Where: isApproved == false
Sort by: appliedAt (descending)
```

**For Each Application:**
```
✓ Verify ABN: https://abr.business.gov.au/
  - Search by ABN number
  - Check status is "Active"
  - Check entity name matches application

✓ Google Presence (if URL provided):
  - Open Google Maps link
  - Verify business exists and has photos/reviews
  - Check address matches application

✓ Business Description:
  - Coherent and genuine (not spam like "sdfgsdfg")
  - Makes sense for coffee/cafe business
  - No red flags (selling drugs, illegal activities)

✓ Contact Verification:
  - Phone number looks legitimate (+61...)
  - Email domain matches business (optional but good sign)
```

**Approval Process:**
1. Edit document → Set `isApproved: true`
2. Send approval email:
   - To: [cafe email]
   - Subject: "Pull Up Coffee Application Approved! 🎉"
   - Body: Template below

**Approval Email Template:**
```
Hi [Business Name] Team,

Great news! Your Pull Up Coffee application has been approved.

🔓 Login here: https://pullupcoffee.com.au
📧 Email: [their email]
🔑 Password: [they set this during signup]

Next Steps:
1. Log in to your merchant dashboard
2. Connect your Stripe account (Payments tab)
3. Upload your menu items (Menu tab)
4. Print your free QR poster (Account tab → Marketing Materials)
5. Set your status to "Open" (Operations tab)

You'll start receiving orders immediately once you're live!

Need Help?
- Training videos: [link to onboarding videos]
- Support: hello@pullupcoffee.com.au
- Chat bot: Available in dashboard (Support tab)

Welcome to the Pull Up family! ☕🚗

Cheers,
Steven
Founder, Pull Up Coffee
```

**Rejection Criteria (Rare):**
- ABN doesn't exist or is cancelled
- Business description is spam/inappropriate
- Google Maps shows business is permanently closed
- Obvious fraud attempt (fake details)

**Rejection Email:**
```
Hi [Name],

Thanks for your interest in Pull Up Coffee.

Unfortunately, we couldn't verify your business details at this time. Common reasons:
- ABN not found or inactive
- Business location cannot be verified
- Incomplete application information

If you believe this is an error, please reply with additional verification (ABN certificate, business license, etc.).

Regards,
Pull Up Team
```

---

### 2. Monitor Orders (5 min)
**Location:** Firebase Console > Firestore > `orders` collection

**Quick Checks:**
```
Filter: createdAt > [yesterday]
Count: How many orders in last 24 hours?
Status breakdown:
 - pending (should be 0 after a few hours)
 - accepted (active orders)
 - completed (successful)
 - rejected (should be <5%)
```

**Red Flags:**
- 🚨 Many "pending" orders from yesterday (cafe not checking dashboard)
  → **Action:** SMS cafe owner, check if they need help
  
- 🚨 High rejection rate (>20%)
  → **Action:** Contact cafe to understand why (out of stock? technical issue?)
  
- 🚨 Order created but no paymentIntentId
  → **Action:** Payment failed, investigate Stripe dashboard

---

### 3. Revenue Reconciliation (5 min)
**Compare Firestore vs Stripe**

**Firestore Check:**
```
Open: Firestore > orders
Filter: status == "completed" AND createdAt > [today 00:00]
Manually sum order totals (or use query aggregation)

Example:
Order 1: $12.50
Order 2: $8.00
Order 3: $15.20
Total: $35.70
```

**Stripe Check:**
```
Open: Stripe Dashboard > Payments
Filter: Created → Today
Sum "Amount" column

Example:
Payment 1: $12.50
Payment 2: $8.00
Payment 3: $15.20
Total: $35.70
```

**Expected:** Firestore total ≈ Stripe total (within $1-2 due to timing)

**If Mismatch >5%:**
1. Check Stripe for "Incomplete" payments (customer closed browser)
2. Check Firestore for orders without paymentIntentId
3. Manual reconciliation: match each order to Stripe payment
4. **Action:** Refund stuck payments, contact customers

---

### 4. Check Error Logs (5 min)
**Location:** Firebase Console > Functions/Hosting > Logs

**Look For:**
- 500 Internal Server Error (something broke)
- 404 Not Found (broken links)
- Firebase auth errors (users can't log in)
- Stripe API errors (payment issues)

**Common Errors & Fixes:**
```
Error: "Firebase: Permission denied"
→ Check Firestore security rules
→ Verify user is logged in

Error: "Stripe: No such customer"
→ Customer deleted their Stripe account mid-transaction
→ Gracefully handle with error message

Error: "Twilio: Invalid phone number"
→ Mobile number format validation needed
→ Add +61 prefix automatically
```

---

## Daily Evening Check-In (10-15 minutes)

### 1. Metrics Summary (5 min)
**Create a simple spreadsheet tracking:**

**Daily Tracker (Google Sheets):**
| Date | New Applications | Approved Cafes | Orders | Revenue | SMS Sent | Profit |
|------|-----------------|----------------|--------|---------|----------|--------|
| 2/24 | 3 | 2 | 0 | $0 | 0 | -$0.50 |
| 2/25 | 5 | 4 | 12 | $144 | 8 | $10.40 |
| 2/26 | 8 | 5 | 23 | $276 | 15 | $18.50 |

**How to Populate:**
- Applications: Count `cafes` where `appliedAt` = today
- Approved: Count `cafes` where `isApproved == true && approvedAt == today`
- Orders: Count `orders` where `createdAt` = today
- Revenue: Sum `orders.total` where `status == completed && createdAt == today`
- SMS Sent: Count from Twilio dashboard (or log in Firestore)
- Profit: Revenue × 20% - (SMS cost + Firebase cost estimate)

---

### 2. Support Ticket Check (5 min)
**Location:** hello@pullupcoffee.com.au inbox

**Triage Emails:**
- Customer issues: Payment problems, order not received
- Cafe questions: How to use feature, technical issues
- Spam/marketing: Delete

**Response Time Target:** <4 hours during business hours

**Common Questions & Responses:**

**Q: "My cafe's menu isn't showing to customers"**
A: Check that:
1. Status is set to "Open" (Operations tab)
2. Menu items exist (Menu tab)
3. isApproved is true (admin check)

**Q: "I got charged but my order disappeared"**
A: Check Stripe for payment, manually create order if confirmed. Apologize, offer $5 credit.

**Q: "How do I change my cafe location?"**
A: Currently requires manual update. Reply: "Please email your new address and ABN to hello@pullupcoffee.com.au and we'll update it within 24 hours."

---

### 3. Bot Analytics Review (5 min)
**Location:** Merchant Dashboard > Support tab > Weekly Insights

**What to Look For:**
- Most common questions asked
- Questions bot couldn't answer (escalations)
- Topics with high query counts (need better documentation)

**Action Items:**
- If same question asked >5 times → Add to bot knowledge base
- If feature requests repeated → Add to product roadmap
- If technical issues reported → Investigate and fix

---

## Weekly Deep Dive (Sunday Evening - 1 hour)

### 1. Financial Review (20 min)
**Calculate Weekly P&L:**
```
Revenue:
+ Total order value paid: $XXX
+ Platform fees earned (20% of curbside fees): $XX

Costs:
- Firebase hosting: ~$5/week
- Twilio SMS: [count] × $0.10 = $X
- Stripe fees: Revenue × 1.75% = $XX
- Domain/email: ~$1/week

Net Profit: Revenue - Costs = $XX
```

**Profitability Check:**
- Profitable? → Great, keep growing!
- Break-even? → Expected in early weeks
- Losing money? → Check if SMS costs too high (limit free sending?)

---

### 2. Cafe Health Check (15 min)
**Identify Problem Cafes:**

**Firestore Query:**
```
Orders where cafeId = [specific cafe]
Filter by: last 7 days
```

**For Each Active Cafe:**
- How many orders? (0 = investigate)
- Average acceptance time? (>10 min = too slow, coach them)
- Rejection rate? (>10% = out of stock issues?)

**Outreach:**
- 0 orders: "Hi [Cafe], noticed you haven't received orders yet. Need help with marketing materials?"
- Slow acceptance: "Quick tip: faster acceptance = happier customers. Aim for <5 minutes!"
- High rejections: "Let's chat about inventory management. Can we help predict demand?"

---

### 3. Security Audit (15 min)
**Check Firebase Authentication Logs:**
```
Firebase Console > Authentication > Users
Look for:
- Unusual signup patterns (10+ accounts from same IP)
- Deleted accounts (may indicate fraud cleanup)
- Password reset requests (could indicate hacking attempts)
```

**Check Stripe for Disputes:**
```
Stripe Dashboard > Disputes
Filter: All time
Status: Respond quickly to avoid auto-loss
```

**Firestore Data Integrity:**
```
Spot-check 5 random orders:
✓ Has valid cafeId
✓ Has valid paymentIntentId
✓ Cart items match menu
✓ Total calculation accurate
```

---

### 4. Growth Planning (10 min)
**Reflect on the Week:**
- What worked well?
- What frustrated merchants/customers?
- What feature requests came up repeatedly?
- What's the biggest bottleneck to growth?

**Set Next Week's Goal:**
Examples:
- Week 1: Get first 5 cafes live
- Week 2: Reach 50 orders
- Week 3: Hit $500 total revenue
- Week 4: Onboard first suburban cafe (expand beyond CBD)

---

## Problem Detection & Response Flowcharts

### Problem: Cafe Hasn't Received Any Orders (Been Live 3+ Days)

**Diagnosis:**
1. Is cafe status "Open" in Firestore?
2. Does cafe have >3 menu items uploaded?
3. Is cafe appearing in customer Discovery page?
4. Is cafe's QR code displayed in-store?

**Triage:**
- ❌ Status = Closed → Remind cafe to toggle to Open
- ❌ No menu items → Offer to load Top 7 presets for them
- ❌ Not in Discovery → Check `isApproved` flag
- ❌ No QR displayed → Send poster download link

**Proactive Action:**
- Send "No orders yet? Here's how to get your first customer" email after 48 hours of inactivity

---

### Problem: Customer Can't Complete Checkout

**Symptoms:**
- High cart abandonment rate
- Customer emails saying "payment not working"

**Diagnosis:**
1. Check Stripe logs for declined payments
2. Check browser console errors (ask customer for screenshot)
3. Try checkout flow yourself on same device/network

**Common Causes:**
- Card declined by bank (customer's issue)
- Stripe API keys wrong (your issue)
- Checkout page not loading (hosting issue)
- Form validation blocking submission (UX bug)

**Resolution:**
- Card declined: Customer must contact bank
- API keys: Check `.env` file has LIVE keys
- Page not loading: Check Firebase console for errors
- Validation bug: Fix and redeploy

---

### Problem: SMS Not Sending

**Symptoms:**
- Cafe clicks "Send Delay Notice", nothing happens
- Customer doesn't receive arrival confirmation

**Diagnosis:**
1. Check Twilio dashboard for message logs
2. Check mobile number format in order data
3. Check Twilio account balance

**Causes & Fixes:**
- Number format wrong: Add validation (must be +61XXXXXXXXX)
- Twilio balance $0: Top up immediately, set up auto-recharge
- Twilio account suspended: Contact support (rare, usually billing issue)

**Prevention:**
- Set up low balance alert in Twilio ($10 threshold)
- Add credit card for auto-recharge

---

## Passive Income Optimization

**Goal:** Minimize daily work while maintaining quality

### Automation Opportunities

**Phase 1: Semi-Automated (Weeks 1-4)**
- Manual cafe approval (but fast: 10 min/day)
- Automated order flow (already working)
- Manual support email responses

**Phase 2: Mostly Automated (Months 2-3)**
- Auto-approve cafes with valid ABN + Google Maps link
  - Set flag `autoApproved: true` if verification passes
  - Manual review only for edge cases
- Canned responses for common support questions
  - Save templates in Gmail/help desk
- Weekly instead of daily checks
  - Set up alerts for critical issues only

**Phase 3: Fully Passive (Months 4-6)**
- Hire part-time VA ($15/hr × 10 hrs/week) to handle:
  - Cafe approvals
  - Support emails
  - Weekly reports
- Your job: Review weekly report, make strategic decisions

---

## Alert System Setup

**Use Case:** Get notified only when something needs immediate attention

### Firebase Cloud Messaging (Future)
Set up alerts for:
- 🔴 Critical: Payment failed, site down, security breach
- 🟡 Warning: High rejection rate, slow cafe response, low Twilio balance
- 🟢 Info: New cafe signed up, milestone reached (100th order!)

### Email Alerts (Quick Setup)
**Trigger emails for:**
- Firebase quota at 80%
- Stripe dispute filed
- Twilio balance <$10
- 10+ cafes pending approval

**Tools:**
- Firebase Functions + SendGrid
- Stripe webhook → Email
- Twilio balance alert (built-in)

---

## Time Investment Breakdown

### First Month (Active Growth Phase)
- **Daily:** 30-60 min (applications, monitoring, support)
- **Weekly:** 60 min (deep dive, planning)
- **Total:** ~5-8 hours/week

### Months 2-3 (Optimization Phase)
- **Daily:** 15-30 min (automated approval, spot checks)
- **Weekly:** 30 min (review metrics)
- **Total:** ~3-4 hours/week

### Months 4+ (Passive Income Phase)
- **Daily:** 0 min (VA handles routine)
- **Weekly:** 30 min (review VA report, strategic decisions)
- **Total:** ~2 hours/week

**With 100 cafes generating $500/week profit:**
- Time investment: 2 hours/week
- Hourly rate: $250/hour
- **That's the dream!** ☕💰

---

## Key Performance Indicators (Dashboard)

### Daily KPIs
- **New Applications:** Target 2-5/day
- **Orders:** Target 50+/day (once at 50 cafes)
- **Revenue:** Target $500+/day (at scale)
- **Approval Time:** <24 hours
- **Support Response Time:** <4 hours

### Weekly KPIs
- **Active Cafes:** Target 80% of approved cafes (placed 1+ order this week)
- **Avg Orders Per Cafe:** Target 5-10/week
- **Customer Retention:** Target 30% return customer rate
- **Profit Margin:** Target 50%+ after operating costs

### Monthly KPIs
- **Churn Rate:** Target <5% (cafes going inactive)
- **NPS Score:** Target 8+ (Net Promoter Score survey)
- **Revenue Growth:** Target 20% MoM
- **Market Penetration:** Target X% of local cafes using platform

---

## Success Milestone Checklist

### Week 1: Proof of Concept
- [ ] 5 cafes signed up
- [ ] 2 cafes approved
- [ ] 10 orders placed
- [ ] $100 revenue generated
- [ ] 0 critical bugs

### Month 1: Product-Market Fit
- [ ] 20 cafes signed up
- [ ] 15 cafes approved and active
- [ ] 200 orders placed
- [ ] $2,000 revenue
- [ ] 1 cafe earning $100+/week extra

### Month 3: Growth
- [ ] 50 cafes approved
- [ ] 1,000 orders placed
- [ ] $10,000 cumulative revenue
- [ ] Break-even on operating costs
- [ ] Featured in local media

### Month 6: Scale
- [ ] 100 cafes approved
- [ ] 5,000 orders placed
- [ ] $50,000 cumulative revenue
- [ ] Profitable ($2,000+/month net)
- [ ] Expand to sister business (PullUpStore)

---

## Daily Monitoring Checklist (Print & Use)

```
☐ Morning Routine (20-30 min)
  ☐ Check new cafe applications (approve/reject)
  ☐ Monitor orders (spot-check completed orders)
  ☐ Revenue reconciliation (Firestore vs Stripe)
  ☐ Error log review (Firebase console)

☐ Evening Check-In (10-15 min)
  ☐ Update metrics spreadsheet
  ☐ Respond to support emails
  ☐ Review bot analytics

☐ Weekly Deep Dive (Sunday evening, 1 hour)
  ☐ Financial review (P&L calculation)
  ☐ Cafe health check (identify inactive cafes)
  ☐ Security audit (Firebase + Stripe)
  ☐ Growth planning (set next week's goal)
```

---

## You're In Control! 🎯

**Remember:**
- Systems > Hustle
- Automate ruthlessly
- Respond fast, but don't burn out
- Growth is great, but profit matters more
- It's YOUR business - run it your way!

**Your Future Self Will Thank You For:**
- Building monitoring systems now
- Documenting processes clearly
- Automating early and often
- Taking weekends off (seriously!)

---

**Created:** February 24, 2026  
**Last Updated:** February 24, 2026  
**Goal:** Work smarter, not harder 💪☕
