# 01 — AU Launch Go-Live Checklist (Recovered)

Recovered from your screenshot state (Feb 26, 2026) after the file was emptied.

## 1) Launch Go-Live Checklist (CHRONOLOGICAL Runbook)

### QUICK START (Exact Steps For Your Current Setup — Beginner Mode)

### Step 1 — Confirm target end state
- [x] `pullupcoffee.com` active in Vercel
- [x] `www.pullupcoffee.com` active in Vercel (redirecting to apex)
- [ ] `pullupcoffee.com.au` active in Vercel
- [ ] `www.pullupcoffee.com.au` active in Vercel (redirecting to `.com`)

### Step 2 — Prepare Vercel DNS values
- [x] Open Vercel → Project `pullup-v2` → Settings → Domains
- [x] Keep the page open so you can copy exact DNS values for each domain
- [x] Keep Squarespace Domains open in a second tab

### Step 3 — Update DNS in Squarespace (this is the real cutover)

#### Step 3B — EXACT DNS lines to enter (copy/paste guide)

### Domain: `pullupcoffee.com` (you are on this screen now)

Record 1
- [x] Host: `www`
- [x] Type: `CNAME`
- [x] Priority: leave blank / default
- [x] TTL: `4 hrs` (default is fine)
- [x] Data/Target: copy from Vercel row **www.pullupcoffee.com → DNS Records → Value**
- [x] Click **SAVE**

#### Domain: `pullupcoffee.com.au`

Record 1
- [ ] Host: `@`
- [ ] Type: use exactly what Vercel shows in **pullupcoffee.com.au → DNS Records**
- [x] Priority: leave blank / default
- [x] TTL: `4 hrs`
- [ ] Data/Value: copy exact value from Vercel for `pullupcoffee.com.au`
- [ ] Click **SAVE**

Record 2
- [ ] Host: `www`
- [ ] Type: `CNAME`
- [ ] Priority: leave blank / default
- [ ] TTL: `4 hrs`
- [ ] Data/Target: `ceb67a41af9b44c.vercel-dns-017.com`
- [ ] Click **SAVE**

After both domains are updated:
- [ ] Go back to Vercel Domains and click **Refresh** on all 4 custom domains
- [ ] Confirm all 4 custom domains show **Valid Configuration**

### Step 4 — Keep `.com.au` forwarding to `.com`
1. [ ] In Squarespace Domains → click `pullupcoffee.com.au`
2. [ ] Open **Forwarding** settings
3. [ ] Turn OFF forwarding for `.com.au` (important, because Vercel is already handling redirects)
4. [ ] Save

Why: using both Squarespace forwarding and Vercel redirects can cause double-redirect confusion.

### Step 5 — Final verification (post-propagation)
- [ ] In Vercel, both `pullupcoffee.com.au` and `www.pullupcoffee.com.au` show **Valid Configuration**
- [ ] `https://pullupcoffee.com` loads production site
- [ ] `https://www.pullupcoffee.com` redirects to `https://pullupcoffee.com`
- [ ] `https://pullupcoffee.com.au` redirects to `https://pullupcoffee.com`
- [ ] `https://www.pullupcoffee.com.au` redirects to `https://pullupcoffee.com`

### Step 6 — If still invalid after 30–60 min
- [ ] Re-check host/type/value for `.com.au` rows in Squarespace against Vercel exactly
- [ ] Remove duplicate/old conflicting A/CNAME records for `.com.au`
- [ ] Keep only records Vercel requests for the affected domain
- [ ] In Vercel, click **Refresh** again
- [ ] Wait for propagation and retest
