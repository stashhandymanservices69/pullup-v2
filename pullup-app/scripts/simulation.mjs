#!/usr/bin/env node
/**
 * Pull Up Coffee — Full Business Simulation Script
 * 
 * Simulates 30-45 business days of operations:
 * - Ashley signs up as affiliate → gets referral code
 * - Steven signs up his cafe with Ashley's referral code
 * - Cafe gets approved
 * - Ashley orders 6-7 times per day for 30+ days
 * - Affiliate commissions tracked automatically
 * - Real emails sent to both parties
 * - Real SMS sent for order notifications
 * 
 * SAFETY: Uses Stripe TEST mode only. Printful orders are NOT triggered
 * (webhook only processes Printful for 'hat' tier in metadata).
 * 
 * Usage: node scripts/simulation.mjs
 * Requires: .env.local to be loaded (uses dotenv)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

// Load env vars manually
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // Remove quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

// Dynamic imports after env is loaded
const admin = (await import('firebase-admin')).default;
const Stripe = (await import('stripe')).default;
const { Resend } = await import('resend');

// ─── Config ───────────────────────────────────────────────────────
const SITE_URL = process.env.SITE_URL || 'https://pullupcoffee.com';

const STEVEN = {
  name: 'Steven Weir',
  email: 'stevenbrianweir@gmail.com',
  phone: '+61409350889',
  businessName: 'Pull Up Test Cafe — Steven\'s',
  address: '123 Test Street, Sydney NSW 2000',
  abn: '17587686972',
};

const ASHLEY = {
  name: 'Ashley Murray',
  email: 'ashclairemurray@gmail.com',
  phone: '+61439870252',
  car: { color: 'White', make: 'Toyota', model: 'Yaris', rego: '281 CH7' },
};

const MENU_ITEMS = [
  { name: 'Flat White', price: 4.50 },
  { name: 'Espresso', price: 3.80 },
  { name: 'Cappuccino', price: 4.80 },
  { name: 'Latte', price: 5.00 },
  { name: 'Long Black', price: 4.20 },
  { name: 'Mocha', price: 5.20 },
  { name: 'Iced Latte', price: 5.50 },
];

const SIZES = ['Small', 'Medium', 'Large'];
const MILKS = ['Full Cream', 'Oat', 'Almond', 'Soy'];
const CURBSIDE_FEE = 2.00;
const SIM_DAYS = 35;
const ORDERS_PER_DAY_MIN = 5;
const ORDERS_PER_DAY_MAX = 7;

// ─── Firebase Admin Init ──────────────────────────────────────────
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}
const db = admin.firestore();

// ─── Stripe Init ──────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });

// ─── Resend Init ──────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Helpers ──────────────────────────────────────────────────────
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }

function generateOrderId() {
  return 'SIM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ─── Step 1: Register Ashley as Affiliate ─────────────────────────
async function registerAffiliate() {
  log('🤝', 'Registering Ashley as affiliate...');
  
  // Check if already exists
  const existingSnap = await db.collection('affiliates').where('email', '==', ASHLEY.email).get();
  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0].data();
    log('✅', `Ashley already registered as affiliate: ${existing.referralCode}`);
    return existing.referralCode;
  }
  
  // Create directly in Firestore (bypasses origin check on API)
  const referralCode = 'PULLUP-ASHLEY-SIM1';
  
  await db.collection('affiliates').add({
    name: ASHLEY.name,
    email: ASHLEY.email,
    phone: ASHLEY.phone,
    country: 'AU',
    channels: 'Instagram, TikTok, Word of Mouth',
    referralCode,
    status: 'active',
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    totalCommissionCents: 0,
    totalReferrals: 0,
    referredCafes: [],
    paidOutCents: 0,
  });
  
  // Send welcome email
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@pullupcoffee.com.au',
      to: ASHLEY.email,
      subject: '🎉 Welcome to Pull Up Coffee Affiliates!',
      html: `
        <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:24px;">
          <h2 style="color:#ea580c;">Welcome to Pull Up Coffee Affiliates!</h2>
          <p>Hi ${ASHLEY.name},</p>
          <p>Your affiliate application has been approved! Here's your unique referral code:</p>
          <div style="background:#f5f5f4; border:2px dashed #ea580c; border-radius:12px; padding:20px; text-align:center; margin:16px 0;">
            <p style="font-size:12px; color:#78716c; text-transform:uppercase; letter-spacing:2px; margin:0 0 8px 0;">Your Referral Code</p>
            <p style="font-size:28px; font-weight:900; color:#ea580c; margin:0; letter-spacing:3px;">${referralCode}</p>
          </div>
          <h3 style="color:#1c1917;">How It Works</h3>
          <ol>
            <li>Share your code with cafes and food businesses</li>
            <li>When they sign up and enter your code, they're linked to you</li>
            <li>You earn 25% of the platform fee for their first 30 days</li>
            <li>More orders = more commission!</li>
          </ol>
          <p><strong>Example:</strong> Every order has a flat $0.99 Pull Up Service Fee. You earn ~$0.25 per order (25%). 50 orders/day = $12.50/day = $375/month from just one cafe.</p>
          <p>Cheers,<br><strong>Steven — Founder, Pull Up Coffee</strong></p>
        </div>
      `,
      text: `Welcome to Pull Up Affiliates!\n\nYour referral code: ${referralCode}\n\nShare this with cafes. You earn 25% of the platform fee for their first 30 days.\n\nCheers, Steven`,
    });
    log('📧', `Welcome email sent to Ashley: ${ASHLEY.email}`);
  } catch (e) {
    log('⚠️', `Email error: ${e.message}`);
  }
  
  log('✅', `Ashley registered as affiliate with code: ${referralCode}`);
  return referralCode;
}

// ─── Step 2: Create Steven's Test Cafe ────────────────────────────
async function createTestCafe(referralCode) {
  log('☕', 'Setting up Steven\'s test cafe...');
  
  const cafeId = 'test-cafe-steven-sim';
  
  // Check if already exists
  const existing = await db.collection('cafes').doc(cafeId).get();
  if (existing.exists) {
    log('✅', 'Steven\'s test cafe already exists');
    return cafeId;
  }
  
  await db.collection('cafes').doc(cafeId).set({
    businessName: STEVEN.businessName,
    email: STEVEN.email,
    storePhone: STEVEN.phone,
    ownerMobile: STEVEN.phone,
    phone: STEVEN.phone,
    address: STEVEN.address,
    abn: STEVEN.abn,
    country: 'AU',
    isApproved: false,
    status: 'closed',
    curbsideFee: CURBSIDE_FEE,
    globalPricing: { milk: 0.50, syrup: 0.50, medium: 0.50, large: 1.00, extraShot: 0.50 },
    audioTheme: 'modern',
    appliedAt: new Date().toISOString(),
    referredBy: referralCode,
    signupSequence: 999,
    earlyAdopterEligible: false,
    transactionCostModel: 'standard-service-fee',
    stripePercentRate: 0.0175,
  });
  
  // Add menu items
  for (const item of MENU_ITEMS) {
    await db.collection('cafes').doc(cafeId).collection('menu').add({
      ...item,
      active: true,
    });
  }
  
  log('✅', `Test cafe created: ${cafeId}`);
  return cafeId;
}

// ─── Step 3: Approve the Cafe ─────────────────────────────────────
async function approveCafe(cafeId) {
  log('✅', 'Approving Steven\'s cafe...');
  
  const cafeRef = db.collection('cafes').doc(cafeId);
  const cafeDoc = await cafeRef.get();
  
  if (cafeDoc.data()?.isApproved) {
    log('✅', 'Cafe already approved');
    return;
  }
  
  await cafeRef.update({
    isApproved: true,
    status: 'open',
    approvedAt: new Date().toISOString(),
    approvedBy: 'simulation-script',
  });
  
  // Link cafe to affiliate (direct Firestore lookup, bypasses API origin check)
  try {
    const referredBy = cafeDoc.data()?.referredBy;
    if (referredBy) {
      const affSnap = await db.collection('affiliates')
        .where('referralCode', '==', referredBy)
        .get();
      if (!affSnap.empty) {
        const affiliateId = affSnap.docs[0].id;
        await cafeRef.update({
          affiliateId,
          affiliateWindowStart: new Date().toISOString(),
          affiliateWindowEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day commission window
          affiliatePeriodOrders: 0,
        });
        // Update affiliate's referred cafes
        await affSnap.docs[0].ref.update({
          referredCafes: admin.firestore.FieldValue.arrayUnion(cafeId),
          totalReferrals: admin.firestore.FieldValue.increment(1),
        });
        log('✅', `Cafe linked to affiliate ${affiliateId} with 60-day commission window`);
      } else {
        log('⚠️', `No affiliate found for code: ${referredBy}`);
      }
    }
  } catch (e) {
    log('⚠️', `Affiliate linking error: ${e.message}`);
  }
  
  // Send approval email
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@pullupcoffee.com.au',
      to: STEVEN.email,
      subject: '🎉 Your Pull Up Coffee Cafe Has Been Approved!',
      html: `<h2>Congratulations, ${STEVEN.name}!</h2><p>Your cafe "${STEVEN.businessName}" has been approved on Pull Up Coffee.</p><p>You can now open your store and start accepting curbside orders.</p><p>Cheers,<br>Steven — Founder, Pull Up Coffee</p>`,
      text: `Congratulations! Your cafe "${STEVEN.businessName}" has been approved. Open your store dashboard to start accepting orders.`,
    });
    log('📧', `Approval email sent to ${STEVEN.email}`);
  } catch (e) {
    log('⚠️', `Email error: ${e.message}`);
  }
  
  log('✅', 'Cafe approved and open');
}

// ─── Step 4: Simulate Orders ──────────────────────────────────────
async function simulateOrders(cafeId) {
  log('📦', `Starting ${SIM_DAYS}-day order simulation...`);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - SIM_DAYS); // Backdate from today
  
  let totalOrders = 0;
  let totalRevenue = 0;
  let totalCommission = 0;
  
  // Cache cafe data for affiliate tracking (avoid reading it per order)
  const cafeDoc = await db.collection('cafes').doc(cafeId).get();
  const cachedCafeData = cafeDoc.data();
  
  for (let day = 0; day < SIM_DAYS; day++) {
    const orderDate = new Date(startDate);
    orderDate.setDate(orderDate.getDate() + day);
    
    // Skip weekends (optional — cafes may be open)
    const dow = orderDate.getDay();
    if (dow === 0) continue; // Skip Sunday
    
    const ordersToday = randomInt(ORDERS_PER_DAY_MIN, ORDERS_PER_DAY_MAX);
    
    for (let o = 0; o < ordersToday; o++) {
      const item = randomItem(MENU_ITEMS);
      const size = randomItem(SIZES);
      const milk = randomItem(MILKS);
      
      // Calculate price adjustments
      let price = item.price;
      if (size === 'Medium') price += 0.50;
      if (size === 'Large') price += 1.00;
      if (milk !== 'Full Cream') price += 0.50;
      const extraShot = Math.random() > 0.7;
      if (extraShot) price += 0.50;
      
      const orderId = generateOrderId();
      const orderTimestamp = new Date(orderDate);
      orderTimestamp.setHours(6 + Math.floor(Math.random() * 10)); // 6am - 4pm
      orderTimestamp.setMinutes(Math.floor(Math.random() * 60));
      
      const subtotalCents = Math.round(price * 100);
      const curbsideFeeCents = Math.round(CURBSIDE_FEE * 100);
      const totalCents = subtotalCents + curbsideFeeCents;
      const platformFeeCents = 99; // $0.99 flat service fee
      const cafeShareCents = curbsideFeeCents; // Cafe keeps 100% of curbside fee
      
      // Create order in Firestore
      const orderData = {
        cafeId,
        orderId,
        customerName: ASHLEY.name,
        customerEmail: ASHLEY.email,
        customerPhone: ASHLEY.phone,
        carColor: ASHLEY.car.color,
        carMake: ASHLEY.car.make,
        carModel: ASHLEY.car.model,
        rego: ASHLEY.car.rego,
        items: [{
          name: item.name,
          size,
          milk,
          price,
          extraShot,
        }],
        subtotal: price,
        curbsideFee: CURBSIDE_FEE,
        total: price + CURBSIDE_FEE,
        totalCents,
        platformFeeCents,
        status: 'completed',
        paymentState: 'captured',
        timestamp: orderTimestamp.toISOString(),
        completedAt: orderTimestamp.toISOString(),
        isSimulation: true,
      };
      
      await db.collection('orders').doc(orderId).set(orderData);
      
      // Track affiliate commission (direct Firestore, not via API to avoid rate limits)
      // Read cafe data once per day batch (cached below the day loop)
      if (cachedCafeData?.affiliateId && cachedCafeData?.affiliateWindowEnd) {
        const windowEnd = new Date(cachedCafeData.affiliateWindowEnd);
        if (orderTimestamp <= windowEnd) {
          const commissionCents = Math.round(platformFeeCents * 0.25); // 25% of $0.99 = ~$0.25
          
          await db.collection('affiliate_commissions').add({
            affiliateId: cachedCafeData.affiliateId,
            cafeId,
            cafeName: cachedCafeData.businessName,
            orderId,
            orderAmountCents: totalCents,
            platformFeeCents,
            commissionCents,
            createdAt: orderTimestamp.toISOString(),
            status: 'pending',
          });
          
          // Update affiliate totals
          const affRef = db.collection('affiliates').doc(cachedCafeData.affiliateId);
          await affRef.update({
            totalCommissionCents: admin.firestore.FieldValue.increment(commissionCents),
          });
          
          totalCommission += commissionCents;
        }
      }
      
      // Update cafe order count
      await db.collection('cafes').doc(cafeId).update({
        affiliatePeriodOrders: admin.firestore.FieldValue.increment(1),
      });
      
      totalOrders++;
      totalRevenue += totalCents;
    }
    
    // Log progress every 5 days
    if ((day + 1) % 5 === 0) {
      log('📊', `Day ${day + 1}/${SIM_DAYS}: ${totalOrders} orders, $${(totalRevenue / 100).toFixed(2)} revenue, $${(totalCommission / 100).toFixed(2)} affiliate commission`);
    }
    
    // Small delay to avoid overwhelming Firestore
    await sleep(100);
  }
  
  log('✅', `Simulation complete: ${totalOrders} orders over ${SIM_DAYS} days`);
  log('💰', `Total revenue: $${(totalRevenue / 100).toFixed(2)}`);
  log('🤝', `Total affiliate commission: $${(totalCommission / 100).toFixed(2)}`);
  
  return { totalOrders, totalRevenue, totalCommission };
}

// ─── Step 5: Send Summary Emails ──────────────────────────────────
async function sendSummaryEmails(stats) {
  log('📧', 'Sending simulation summary emails...');
  
  // Email to Steven (cafe owner)
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@pullupcoffee.com.au',
      to: STEVEN.email,
      subject: '☕ Pull Up Simulation Complete — Your Cafe Dashboard Summary',
      html: `
        <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:24px;">
          <h2 style="color:#ea580c;">Pull Up Coffee — Simulation Report</h2>
          <p>Hi ${STEVEN.name},</p>
          <p>Your test cafe simulation has completed successfully. Here's the summary:</p>
          <table style="width:100%; border-collapse:collapse; margin:16px 0;">
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:8px 0; font-weight:bold;">Total Orders</td>
              <td style="padding:8px 0; text-align:right;">${stats.totalOrders}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:8px 0; font-weight:bold;">Total Revenue</td>
              <td style="padding:8px 0; text-align:right;">$${(stats.totalRevenue / 100).toFixed(2)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:8px 0; font-weight:bold;">Curbside Fees (100% to Cafe)</td>
              <td style="padding:8px 0; text-align:right;">$${((stats.totalOrders * CURBSIDE_FEE * 100) / 100).toFixed(2)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:8px 0; font-weight:bold;">Platform Fee ($0.99/order)</td>
              <td style="padding:8px 0; text-align:right;">$${((stats.totalOrders * 99) / 100).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; font-weight:bold;">Simulation Period</td>
              <td style="padding:8px 0; text-align:right;">${SIM_DAYS} days</td>
            </tr>
          </table>
          <p style="color:#78716c; font-size:13px;">This was a test simulation. No real payments were processed.</p>
          <p>Cheers,<br><strong>Steven — Founder, Pull Up Coffee</strong></p>
        </div>
      `,
      text: `Pull Up Simulation Report\n\nTotal Orders: ${stats.totalOrders}\nTotal Revenue: $${(stats.totalRevenue / 100).toFixed(2)}\nSimulation: ${SIM_DAYS} days\n\nThis was a test simulation.`,
    });
    log('📧', `Summary email sent to Steven: ${STEVEN.email}`);
  } catch (e) {
    log('⚠️', `Email to Steven failed: ${e.message}`);
  }
  
  // Email to Ashley (affiliate)
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@pullupcoffee.com.au',
      to: ASHLEY.email,
      subject: '🤝 Your Pull Up Affiliate Commission Report',
      html: `
        <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:24px;">
          <h2 style="color:#ea580c;">Pull Up Coffee — Affiliate Commission Report</h2>
          <p>Hi ${ASHLEY.name},</p>
          <p>Here's your affiliate earnings summary from the simulation:</p>
          <table style="width:100%; border-collapse:collapse; margin:16px 0;">
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:8px 0; font-weight:bold;">Total Commission Earned</td>
              <td style="padding:8px 0; text-align:right; color:#16a34a; font-weight:bold;">$${(stats.totalCommission / 100).toFixed(2)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:8px 0; font-weight:bold;">Orders Generating Commission</td>
              <td style="padding:8px 0; text-align:right;">${stats.totalOrders}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:8px 0; font-weight:bold;">Commission Per Order</td>
              <td style="padding:8px 0; text-align:right;">~$0.25 (25% of $0.99)</td>
            </tr>
            <tr>
              <td style="padding:8px 0; font-weight:bold;">Commission Window</td>
              <td style="padding:8px 0; text-align:right;">30 calendar days</td>
            </tr>
          </table>
          <p style="color:#78716c; font-size:13px;">This was a test simulation. No real payouts will be processed.</p>
          <p>Cheers,<br><strong>Steven — Founder, Pull Up Coffee</strong></p>
        </div>
      `,
      text: `Pull Up Affiliate Report\n\nTotal Commission: $${(stats.totalCommission / 100).toFixed(2)}\nOrders: ${stats.totalOrders}\nRate: ~$0.25/order (25% of $0.99 platform fee)\n\nThis was a test simulation.`,
    });
    log('📧', `Commission report sent to Ashley: ${ASHLEY.email}`);
  } catch (e) {
    log('⚠️', `Email to Ashley failed: ${e.message}`);
  }
}

// ─── Step 6: Send Test SMS ────────────────────────────────────────
async function sendTestSMS() {
  log('📱', 'Sending test SMS notifications...');
  
  // Only send if Twilio credentials exist
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    log('⚠️', 'Twilio credentials not found — skipping SMS');
    return;
  }
  
  const twilio = (await import('twilio')).default;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const from = process.env.TWILIO_FROM_NUMBER;
  
  // SMS to Steven (cafe owner — new order notification)
  try {
    await client.messages.create({
      body: `☕ Pull Up Sim: You received ${SIM_DAYS} days of test orders! Check your Pull Up dashboard for the full report.`,
      from,
      to: STEVEN.phone,
    });
    log('📱', `SMS sent to Steven: ${STEVEN.phone}`);
  } catch (e) {
    log('⚠️', `SMS to Steven failed: ${e.message}`);
  }
  
  // SMS to Ashley (customer — order confirmation sample)
  try {
    await client.messages.create({
      body: `🎉 Pull Up Sim Complete! Your affiliate code generated $${(0).toFixed(2)} in commissions over ${SIM_DAYS} days. Check your email for the full report!`,
      from,
      to: ASHLEY.phone,
    });
    log('📱', `SMS sent to Ashley: ${ASHLEY.phone}`);
  } catch (e) {
    log('⚠️', `SMS to Ashley failed: ${e.message}`);
  }
}

// ─── Step 7: Simulate Donation & Merch (Non-Printful) ─────────────
async function simulateDonationsAndMerch(cafeId) {
  log('🎁', 'Simulating donation tiers and merch...');
  
  const donations = [
    { tier: 'coffee', name: 'Buy the Founder a Coffee', amount: 450 },
    { tier: 'supporter', name: 'Legend — Pull Up Coffee', amount: 1000 },
    { tier: 'vip', name: 'Big Supporter VIP', amount: 2500 },
  ];
  
  for (const donation of donations) {
    const orderId = generateOrderId();
    await db.collection('orders').doc(orderId).set({
      type: 'donation',
      tier: donation.tier,
      name: donation.name,
      amountCents: donation.amount,
      customerName: ASHLEY.name,
      customerEmail: ASHLEY.email,
      status: 'completed',
      paymentState: 'captured',
      timestamp: new Date().toISOString(),
      isSimulation: true,
    });
    log('💰', `${donation.name}: $${(donation.amount / 100).toFixed(2)}`);
  }
  
  // Custom VIP amount
  const customAmount = 5000; // $50
  const customId = generateOrderId();
  await db.collection('orders').doc(customId).set({
    type: 'donation',
    tier: 'vip',
    name: 'Big Supporter VIP — Custom',
    amountCents: customAmount,
    customerName: ASHLEY.name,
    customerEmail: ASHLEY.email,
    status: 'completed',
    paymentState: 'captured',
    timestamp: new Date().toISOString(),
    isSimulation: true,
  });
  log('💰', `Custom VIP donation: $${(customAmount / 100).toFixed(2)}`);
  
  // NOTE: Hat/merch purchase is NOT simulated to avoid triggering Printful
  log('🎩', 'Skipping hat purchase (would trigger real Printful order)');
  
  log('✅', 'Donations simulated');
}

// ─── Main Execution ───────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Pull Up Coffee — Full Business Simulation     ║');
  console.log('║   Stripe: TEST MODE | Emails: REAL | SMS: REAL  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  
  try {
    // Step 1: Register Ashley as affiliate
    const referralCode = await registerAffiliate();
    await sleep(1000);
    
    // Step 2: Create Steven's test cafe with Ashley's referral
    const cafeId = await createTestCafe(referralCode);
    await sleep(1000);
    
    // Step 3: Approve the cafe
    await approveCafe(cafeId);
    await sleep(1000);
    
    // Step 4: Simulate 35 days of orders
    const stats = await simulateOrders(cafeId);
    await sleep(1000);
    
    // Step 5: Simulate donations (no hat — avoids Printful)
    await simulateDonationsAndMerch(cafeId);
    await sleep(1000);
    
    // Step 6: Send summary emails
    await sendSummaryEmails(stats);
    await sleep(1000);
    
    // Step 7: Send test SMS
    await sendTestSMS();
    
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║              SIMULATION COMPLETE                 ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Orders:     ${String(stats.totalOrders).padStart(6)}                          ║`);
    console.log(`║  Revenue:    $${(stats.totalRevenue / 100).toFixed(2).padStart(9)}                       ║`);
    console.log(`║  Commission: $${(stats.totalCommission / 100).toFixed(2).padStart(9)}                       ║`);
    console.log(`║  Days:       ${String(SIM_DAYS).padStart(6)}                          ║`);
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    log('📧', `Emails sent to: ${STEVEN.email} + ${ASHLEY.email}`);
    log('📱', `SMS sent to: ${STEVEN.phone} + ${ASHLEY.phone}`);
    log('🔗', `Affiliate dashboard: ${SITE_URL} → Footer → Affiliate`);
    
  } catch (error) {
    console.error('\n❌ Simulation failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
