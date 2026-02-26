# Pull Up Coffee - Production Launch Checklist

**Target Launch Date:** Friday, February 26, 2026  
**Current Status:** Development (localhost:3000)  
**Goal:** Live production deployment with real-world testing capability

---

## Phase 1: Pre-Launch Preparation (Wednesday Evening)

### Code Cleanup & Security
- [ ] Run `npm run lint` - ensure 0 errors
- [ ] Remove all `console.log()` debug statements
- [ ] Remove test/demo data from Firebase
- [ ] Check all API keys are in `.env.local` (NOT hardcoded)
- [ ] Add `.env.local` to `.gitignore` (verify it's already there)
- [ ] Remove any test Stripe keys, replace with production keys
- [ ] Review all Firebase security rules (Firestore, Storage)

### Environment Variables Audit
Create production `.env.local` file with:
```
# Firebase Production
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pullup-coffee-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pullup-coffee-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pullup-coffee-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe Production (LIVE KEYS)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx

# Twilio Production
TWILIO_ACCOUNT_SID=your_live_sid
TWILIO_AUTH_TOKEN=your_live_token
TWILIO_PHONE_NUMBER=+61XXXXXXXXX

# Admin Token (generate new secure random string)
ADMIN_TOKEN=generate_64_char_random_string_here
```

**Security Check:**
- [ ] ALL environment variables use production credentials
- [ ] Stripe keys are LIVE mode (pk_live_, sk_live_)
- [ ] Twilio SMS sender is verified and active
- [ ] Firebase project is separate production instance (not dev)

---

## Phase 2: Firebase Setup (Wednesday Evening)

### Create Production Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add Project" → Name: "pullup-coffee-prod"
3. Enable Google Analytics (optional but recommended)
4. Add web app → Copy config values to `.env.local`

### Enable Firebase Services
- [ ] **Authentication**:
  - Enable Email/Password provider
  - Enable Anonymous provider (for customer guest checkout)
  - Set authorized domains: `pullupcoffee.com.au`, `localhost`

- [ ] **Firestore Database**:
  - Create database in production mode
  - Set location: `australia-southeast1` (Sydney)
  - Deploy security rules (see Firestore Rules section below)

- [ ] **Storage**:
  - Enable Firebase Storage
  - Set CORS rules to allow your domain
  - Deploy security rules (see Storage Rules section below)

### Firestore Security Rules
Deploy these rules via Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cafes collection - merchants can only edit their own
    match /cafes/{cafeId} {
      allow read: if true; // Public read for discovery
      allow write: if request.auth != null && request.auth.uid == cafeId;
      
      // Menu subcollection
      match /menu/{menuId} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.uid == cafeId;
      }
    }
    
    // Orders collection - customers see own, cafes see theirs
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == resource.data.cafeId);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.cafeId;
    }
    
    // Favorites collection - customers manage own
    match /favorites/{favId} {
      allow read, write: if request.auth != null;
    }
    
    // Admin routes - locked down
    match /admin/{document=**} {
      allow read, write: if false; // Admin operations via server-side only
    }
  }
}
```

### Storage Security Rules
Deploy via Firebase Console > Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /menu/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
    match /cafe-photos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

---

## Phase 3: Stripe Production Setup (Thursday Morning)

### Activate Stripe Live Mode
1. Login to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Complete business verification (if not done):
   - Business legal name: Pull Up Coffee Pty Ltd
   - ABN: 17 587 686 972
   - Bank account for payouts
   - Director ID verification

3. Switch to "Live Mode" toggle (top right)
4. Get LIVE API keys:
   - Publishable key: `pk_live_xxxxx`
   - Secret key: `sk_live_xxxxx`
   - Webhook signing secret (for future use)

5. Enable Stripe Connect for merchants:
   - Go to Connect settings
   - Set platform name: Pull Up Coffee
   - Set support email: hello@pullupcoffee.com.au
   - Set branding (logo, colors)

### Test Payment Flow
- [ ] Create test cafe account in production
- [ ] Create test order as customer
- [ ] Complete Stripe Checkout with REAL card (refund after)
- [ ] Verify payment appears in Stripe dashboard
- [ ] Verify payment captured only when cafe accepts order
- [ ] Test refund flow

---

## Phase 4: Domain & Hosting Setup (Thursday)

### Register Domain
**Option A: Crazy Domains** (crazyd omains.com.au)
- Search for `pullupcoffee.com.au`
- Register for ~$15/year
- Estimated time: 10 minutes

**Option B: Namecheap** (namecheap.com)
- Search `.com.au` domain
- Register + WhoisGuard privacy
- Cost: ~$20/year

### Deploy to Firebase Hosting
```powershell
# Install Firebase CLI (if not already)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting (in pullup-app folder)
cd pullup-app
firebase init hosting

# Select options:
# - Use existing project: pullup-coffee-prod
# - Public directory: .next (if using Next.js export) OR out
# - Configure as single-page app: Yes
# - Set up automatic builds: No (manual for now)

# Build production bundle
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Connect Custom Domain
1. In Firebase Console: Hosting > Add custom domain
2. Enter: `pullupcoffee.com.au`
3. Firebase will provide DNS records (A/CNAME)
4. Go to your domain registrar (Crazy Domains/Namecheap)
5. Add DNS records:
   ```
   Type: A
   Name: @
   Value: [Firebase IP addresses provided]
   
   Type: A
   Name: www
   Value: [Firebase IP addresses provided]
   ```
6. Wait 10-60 minutes for DNS propagation
7. Firebase auto-provisions SSL certificate (HTTPS)

**Alternative: Use Firebase Subdomain First**
- Firebase provides free subdomain: `pullup-coffee-prod.web.app`
- Use this for initial testing, add custom domain later
- No DNS setup required, instant HTTPS

---

## Phase 5: Pre-Launch Testing (Thursday Evening)

### Functional Testing Checklist
- [ ] **Landing Page:**
  - Logo loads correctly
  - All footer links work
  - Trademark symbol displays properly
  - Merch store accessible
  - About modal opens
  - Legal modals (Terms/Privacy/IP) open

- [ ] **Merchant Application:**
  - Signup form submits successfully
  - Application saves to Firestore
  - Email validation works
  - Password requirements enforced (min 6 chars)
  - ABN field accepts Australian format
  - Business description textarea saves

- [ ] **Merchant Login:**
  - Existing cafes can log in
  - Password reset email sends successfully
  - Dashboard loads after login

- [ ] **Merchant Dashboard:**
  - All 7 tabs load (Orders/History/Menu/Operations/Payments/Account/Support)
  - QR poster generator works and prints correctly
  - Menu items can be added/edited/deleted
  - Photo upload compresses and saves
  - Stripe Connect redirect works
  - Account settings auto-save

- [ ] **Customer Flow:**
  - Discovery page shows approved cafes
  - Search filter works
  - Heart icon favorites prompts for SMS opt-in
  - Menu displays with photos
  - Add to cart functionality
  - Checkout form validates inputs
  - Stripe payment page loads
  - Order confirmation displays

- [ ] **Real-Time Features:**
  - New orders appear instantly in merchant dashboard
  - Accept/reject buttons work
  - SMS notifications send (test with your mobile)
  - Order status updates reflect immediately

### Security Testing
- [ ] Try accessing `/api/admin` routes without auth - should fail
- [ ] Try editing another cafe's menu while logged in - should fail
- [ ] Try SQL injection in form inputs (e.g., `' OR '1'='1`) - should sanitize
- [ ] Check browser console for exposed API keys - should be none
- [ ] Verify Firebase rules prevent unauthorized data access
- [ ] Test XSS attack vectors (e.g., `<script>alert('xss')</script>` in business name)

### Performance Testing
- [ ] Run Lighthouse audit (Chrome DevTools)
  - Performance score: Target 80+
  - Accessibility score: Target 90+
  - Best Practices: Target 90+
  - SEO: Target 90+

- [ ] Test on mobile devices (iPhone, Android)
- [ ] Test on slow 3G network (Chrome DevTools throttling)
- [ ] Check image loading speed (should be <2 seconds)

---

## Phase 6: Soft Launch with Lock Screen (Friday Morning)

### Implement Maintenance Mode (Optional)
Add a feature flag to show "Coming Soon" page to public while you test:

Create `/pullup-app/app/maintenancemode.tsx`:
```tsx
const MaintenanceMode = () => (
  <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-8">
    <PullUpLogo className="w-32 h-32 mb-8" />
    <h1 className="text-4xl font-serif font-bold mb-4">Almost There!</h1>
    <p className="text-xl text-stone-400 mb-8">Pull Up Coffee is launching soon.</p>
    <form className="space-y-4">
      <input 
        type="email" 
        placeholder="Enter email for early access"
        className="w-full max-w-md p-4 rounded-xl bg-stone-800 border border-stone-700 outline-none focus:border-orange-500"
      />
      <button className="w-full max-w-md bg-orange-600 p-4 rounded-xl font-bold">Notify Me</button>
    </form>
    <p className="mt-8 text-sm text-stone-500">Need immediate access? Email hello@pullupcoffee.com.au</p>
  </div>
);
```

Add bypass code:
```tsx
// In page.tsx, check for early access token
const [earlyAccess, setEarlyAccess] = useState(false);

useEffect(() => {
  const token = new URLSearchParams(window.location.search).get('access');
  if (token === 'launch2026') setEarlyAccess(true);
}, []);

if (!earlyAccess) return <MaintenanceMode />;
```

**Access URL:** `https://pullupcoffee.com.au?access=launch2026`

**Benefits:**
- Public sees "Coming Soon" 
- You can test with real domain
- Early adopter cafes can sign up with secret link
- No rush to go fully public

---

## Phase 7: Production Monitoring Setup (Friday Morning)

### Firebase Monitoring
- [ ] Enable Firebase Performance Monitoring
- [ ] Enable Firebase Crashlytics (web)
- [ ] Set up email alerts for errors

### Stripe Monitoring
- [ ] Enable email notifications for:
  - Successful payments
  - Failed payments
  - Disputes/chargebacks
  - Payout failures

### Custom Monitoring Dashboard
Create simple Firebase Function to log key metrics:
- New cafe applications (daily count)
- Orders placed (hourly count)
- Revenue generated (daily sum)
- SMS sent (cost tracking)

**Quick Implementation:**
Store daily metrics in Firestore `/metrics/{date}` document:
```json
{
  "date": "2026-02-26",
  "applications": 5,
  "orders": 23,
  "revenue": 46.00,
  "sms_sent": 12
}
```

---

## Phase 8: Go Live! (Friday Afternoon)

### Final Pre-Launch Checks
- [ ] All test data deleted from Firestore
- [ ] Test accounts removed (except 1 demo cafe for your own testing)
- [ ] Environment variables double-checked (LIVE keys!)
- [ ] DNS propagation complete (check via dnschecker.org)
- [ ] SSL certificate active (https:// works)
- [ ] Mobile layout tested on real devices
- [ ] Payment flow tested end-to-end with real card

### Remove Maintenance Mode
- [ ] Comment out maintenance mode check
- [ ] Redeploy to Firebase Hosting
- [ ] Verify public can access site

### Announce Launch
- [ ] Post on personal LinkedIn/Facebook
- [ ] Email 10 local cafes personally
- [ ] Share QR poster in local business Facebook groups
- [ ] Tweet about launch (if applicable)
- [ ] Update email signature with link

---

## Phase 9: First 48 Hours - Active Monitoring

### What to Check Daily (First Week)

**Every Morning (30 min):**
- [ ] Check Firestore > cafes collection for new applications
- [ ] Approve pending cafes (review ABN, business details, Google Maps link)
- [ ] Check Firestore > orders collection for completed orders
- [ ] Verify Stripe dashboard matches order count
- [ ] Check for any error logs in Firebase Console
- [ ] Respond to any support emails

**Every Evening (15 min):**
- [ ] Review day's metrics (applications, orders, revenue)
- [ ] Check for unusual activity (fraud attempts, spam signups)
- [ ] Respond to any merchant questions in support bot logs
- [ ] Bank check: Verify Stripe payouts are processing

### Red Flags to Watch For
🚨 **Immediate Action Required:**
- Multiple signups from same email/IP (spam/fraud)
- Orders placed but not appearing in cafe dashboard (bug)
- Payment succeeded but order not created (critical bug)
- SMS not sending (Twilio account issue)
- SSL certificate expired (shouldn't happen, but monitor)

⚠️ **Investigate Within 24 Hours:**
- Cafe applications with suspicious details (fake ABN, no Google presence)
- Customer complaints about incorrect orders
- High cart abandonment rate (checkout UX issue?)
- Long order acceptance time (cafe training needed)

---

## Phase 10: Backend Verification Procedures

### Daily Firebase Checks

**1. New Cafe Applications:**
```
Firestore > cafes (collection)
Filter by: isApproved == false
Sort by: appliedAt (newest first)

For each application:
✓ Check ABN exists: abr.business.gov.au/ABN/View/[ABN]
✓ Google Maps link valid (if provided)
✓ Business description coherent (not spam)
✓ Phone number format correct

To Approve:
1. Edit document
2. Set isApproved: true
3. Send approval email manually (for now)
   Subject: "Pull Up Coffee Application Approved!"
   Body: Include link to login, QR poster download instructions
```

**2. Orders Verification:**
```
Firestore > orders (collection)
Filter by: createdAt > [today]
Sort by: createdAt (desc)

Check each order:
✓ Has valid cafeId (matches existing cafe)
✓ Has valid userId (customer auth)
✓Status progression makes sense:
   pending → accepted → completed (OR rejected)
✓ Payment amount matches cart total
✓ Stripe paymentIntentId exists
```

**3. Revenue Reconciliation:**
```
Daily Check:
1. Count completed orders in Firestore
2. Sum total order values
3. Compare to Stripe dashboard "Volume" for same day
4. Discrepancy >5%? Investigate immediately

Example:
Firestore: 23 orders × avg $12 = $276
Stripe: $275.50
Difference: $0.50 (0.18%) ✓ OK
```

### Weekly Security Audit

**Monday Morning (30 min):**
- [ ] Review Firebase Authentication logs (detect brute force attempts)
- [ ] Check Stripe for disputed/refunded payments
- [ ] Scan Firestore for deleted data (should be minimal)
- [ ] Review any 500 errors in hosting logs
- [ ] Check Twilio SMS logs for unusual spikes
- [ ] Review cafe-reported issues in support bot analytics

---

## Phase 11: Growth Monitoring & Scaling Triggers

### Key Metrics Dashboard (Spreadsheet)
Create Google Sheet tracking:
- **Cafes:** Total, approved, pending, active (placed order this week)
- **Orders:** Daily count, weekly total, monthly recurring
- **Revenue:** Gross, net (after Stripe fees), projection
- **Costs:** Firebase ($X/month), Twilio SMS ($X/month), hosting ($X/month)
- **Profit:** Revenue - costs = net profit

### Scaling Triggers (When to Upgrade)

**Trigger 1: Firebase Free Tier Limit**
- 50k reads/day FREE → $0.06 per 100k thereafter
- Monitor: Firebase Console > Usage tab
- **Action:** Upgrade to Blaze (pay-as-you-go) when consistently hitting 80% of free tier

**Trigger 2: Twilio SMS Costs Exceed $100/month**
- Indicates high order volume (good problem!)
- **Action:** Negotiate bulk SMS rates with Twilio (2-5% discount at scale)

**Trigger 3: 50+ Cafes Active**
- Manual cafe approval becomes bottleneck
- **Action:** Hire part-time support (3 hrs/day) to handle applications

**Trigger 4: Support Bot Failing >20% of Questions**
- Customers/cafes escalating to email frequently
- **Action:** Expand knowledge base, add live chat widget, or hire support

---

## Phase 12: Problem Flowcharts

### Problem: Customer Says Payment Took Money But No Order Confirmation

**Diagnosis:**
1. Check Stripe dashboard for payment intent ID
2. Check Firestore orders collection for matching paymentIntentId
3. Check if redirect back to app succeeded (customer may have closed browser)

**Resolution:**
- **If payment exists, no order:** Manually create order in Firestore, notify cafe
- **If payment pending:** Capture payment, create order
- **If payment failed:** Customer should retry, no charge actually occurred (Stripe shows "incomplete")

**Prevention:**
- Add webhook listener for `payment_intent.succeeded` to auto-create order even if redirect fails

---

### Problem: Cafe Can't See Pending Order

**Diagnosis:**
1. Verify order exists in Firestore with correct cafeId
2. Check cafe's auth.uid matches order's cafeId
3. Check cafe's browser console for errors
4. Check Firebase security rules not blocking read

**Resolution:**
- If cafeId mismatch: Update order cafeId manually
- If security rule blocking: Fix Firestore rules
- If onSnapshot listener broken: Customer should refresh dashboard

**Prevention:**
- Add retry logic to onSnapshot listeners
- Add "Order not appearing? Refresh page" tooltip

---

### Problem: SMS Not Sending

**Diagnosis:**
1. Check Twilio dashboard for failed messages
2. Check mobile number format (must be +61XXXXXXXXX)
3. Check Twilio account balance

**Resolution:**
- If number invalid: Show error to customer "Invalid mobile format"
- If Twilio balance low: Top up immediately
- If Twilio account suspended: Contact Twilio support (rare)

**Prevention:**
- Set up low balance email alert in Twilio
- Validate mobile number format BEFORE saving

---

## Post-Launch Optimization (Week 2 Onwards)

### Continuous Improvement Tasks
- [ ] Collect cafe feedback (Net Promoter Score survey)
- [ ] Analyze cart abandonment rate (set up Google Analytics)
- [ ] A/B test signup flow (short form vs detailed)
- [ ] Add webhook for Stripe payment confirmations
- [ ] Implement real-time customer-to-cafe chat
- [ ] Add email reports for cafe history (currently manual)
- [ ] Build admin panel for easier cafe approval

### Marketing Expansion
- [ ] Create Google My Business listing
- [ ] Set up Facebook Ads (target cafe owners)
- [ ] Create demo video (30 seconds) showing order flow
- [ ] Reach out to local news outlets ("Aussie dad builds tech to help cafes")
- [ ] Submit to startup directories (ProductHunt, BetaList)

---

## Emergency Contacts & Procedures

### If Site Goes Down:
1. Check hosting status: Firebase Status Dashboard
2. Check domain DNS: dnschecker.org
3. Check SSL cert expiry: ssllabs.com
4. Redeploy last known good version: `firebase deploy --only hosting`

### If Payments Fail:
1. Check Stripe status: status.stripe.com
2. Verify API keys are LIVE mode
3. Check Stripe dashboard for declined reason
4. Contact Stripe support: +61-1800-945-815

### If Firebase Errors:
1. Check quota limits: Firebase Console > Usage
2. Check security rules: Firebase Console > Firestore > Rules
3. Check authentication status: Firebase Console > Authentication

### Emergency Support Email:
Create `hello@pullupcoffee.com.au` monitored 24/7 (first month)

---

## Success Metrics - Week 1 Goals

**Minimum Viable Launch:**
- [ ] 5 cafes signed up
- [ ] 2 cafes approved and active
- [ ] 10 orders placed successfully
- [ ] 0 critical bugs reported
- [ ] <1 hour average response time to support emails

**Stretch Goals:**
- [ ] 10 cafes signed up
- [ ] 5 cafes approved and active
- [ ] 50 orders placed
- [ ] 1 cafe earning $100+ from platform
- [ ] Featured in local newspaper/blog

---

## Final Pre-Launch Command Sequence

Run these commands in order on Friday morning:

```powershell
# 1. Navigate to project
cd "C:/Users/Ning - Ning/Desktop/pullup-v2/pullup-app"

# 2. Ensure dependencies are installed
npm install

# 3. Run linter to catch any issues
npm run lint

# 4. Build production-optimized bundle
npm run build

# 5. Test build locally
npm run start
# Open localhost:3000, verify everything works

# 6. Deploy to Firebase
firebase deploy --only hosting

# 7. Open production URL and verify
# https://pullup-coffee-prod.web.app (or custom domain)
```

---

## You're Ready to Launch! 🚀

**Remember:**
- Perfect is the enemy of done
- Ship fast, iterate faster
- Every bug is a learning opportunity
- Customers are forgiving if you're responsive
- You've built something valuable - be proud!

**Friday Evening Celebration Checklist:**
- [ ] Site is live ✅
- [ ] First cafe signed up ✅
- [ ] First order placed ✅
- [ ] Share screenshot on social media ✅
- [ ] Crack a beer (or coffee!) ✅

---

**Created:** February 24, 2026  
**Launch Target:** February 26, 2026  
**Status:** Ready to Deploy

Good luck, Steven. You've got this! 💪☕🚀
