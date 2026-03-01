import { Resend } from 'resend';

// ── Resend client (server-side only) ──────────────────────────
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// Verified sender – update once you verify your domain in Resend dashboard
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'Pull Up Coffee <hello@pullupcoffee.com>';

// ── Shared styles ─────────────────────────────────────────────

const BRAND_ORANGE = '#ea580c';
const BRAND_DARK = '#0f0f0f';
const LINK_BLUE = '#2563eb';

const emailWrapper = (body: string) => `
<div style="background-color:#f5f5f4; padding:32px 0;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${BRAND_DARK}; padding:28px 32px; text-align:center;">
      <h1 style="margin:0; font-size:24px; font-style:italic; color:#ffffff; font-weight:700;">Pull Up Coffee</h1>
      <p style="margin:4px 0 0; font-size:11px; color:#a8a29e; text-transform:uppercase; letter-spacing:2px;">Curbside Coffee · Delivered to Your Car</p>
    </div>
    <div style="padding:32px; color:#1a1a1a; line-height:1.6; font-size:15px;">
      ${body}
    </div>
    <div style="padding:20px 32px; background:#fafaf9; border-top:1px solid #e7e5e4; text-align:center; font-size:12px; color:#a8a29e;">
      <p style="margin:0;">Pull Up Coffee Pty Ltd · ABN 17 587 686 972</p>
      <p style="margin:4px 0 0;"><a href="https://pullupcoffee.com" style="color:${BRAND_ORANGE}; text-decoration:none;">pullupcoffee.com</a> · <a href="mailto:hello@pullupcoffee.com" style="color:${BRAND_ORANGE}; text-decoration:none;">hello@pullupcoffee.com</a></p>
    </div>
  </div>
</div>`.trim();

const btn = (text: string, href: string) =>
  `<a href="${href}" style="display:inline-block; background:${BRAND_ORANGE}; color:#ffffff; padding:14px 32px; border-radius:12px; text-decoration:none; font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:1px; margin:8px 0;">${text}</a>`;

const signoff = `
  <p style="margin-top:28px;">
    Cheers,<br/>
    <strong>Steven</strong><br/>
    <span style="font-size:13px; color:#78716c;">Founder, Pull Up Coffee</span>
  </p>`;

// ── Email templates ───────────────────────────────────────────

/* ─── 1. CAFE APPROVAL (existing, upgraded) ────────────────── */

export function buildApprovalEmail(businessName: string, email: string) {
  const subject = 'Your Pull Up Coffee Application is Approved! 🎉';

  const html = emailWrapper(`
    <h2 style="color:#16a34a; margin-top:0;">Welcome to Pull Up Coffee! ☕🚗</h2>

    <p>Hi <strong>${escapeHtml(businessName)}</strong> Team,</p>

    <p>Great news — your Pull Up Coffee application has been <strong>approved</strong>.</p>

    <p style="text-align:center; margin:24px 0;">
      ${btn('LOG IN TO YOUR DASHBOARD', 'https://pullupcoffee.com')}
    </p>

    <p style="font-size:13px; color:#78716c;">📧 Your login email: ${escapeHtml(email)}</p>

    <h3 style="margin-top:24px; color:${BRAND_DARK};">Next Steps</h3>
    <ol style="padding-left:18px;">
      <li>Log in to your merchant dashboard</li>
      <li>Connect your Stripe account <em>(Payments tab)</em></li>
      <li>Upload your menu items <em>(Menu tab)</em></li>
      <li>Print your free QR poster <em>(Account tab → Marketing Materials)</em></li>
      <li>Set your status to "Open" <em>(Operations tab)</em></li>
    </ol>

    <p>You'll start receiving orders immediately once you're live!</p>

    <h3 style="color:${BRAND_DARK};">Need Help?</h3>
    <ul style="padding-left:18px;">
      <li>Support: <a href="mailto:hello@pullupcoffee.com" style="color:${LINK_BLUE};">hello@pullupcoffee.com</a></li>
      <li>Chat bot available in your dashboard <em>(Support tab)</em></li>
    </ul>

    ${signoff}
  `);

  const text = `Hi ${businessName} Team,

Great news — your Pull Up Coffee application has been approved!

Log in: https://pullupcoffee.com
Email: ${email}

Next Steps:
1. Log in to your merchant dashboard
2. Connect your Stripe account (Payments tab)
3. Upload your menu items (Menu tab)
4. Print your free QR poster (Account tab → Marketing Materials)
5. Set your status to "Open" (Operations tab)

You'll start receiving orders immediately once you're live!

Need Help?
- Support: hello@pullupcoffee.com
- Chat bot: Available in dashboard (Support tab)

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 2. CUSTOMER ORDER CONFIRMATION ──────────────────────── */

export function buildOrderConfirmationEmail(ctx: {
  orderId: string;
  cafeName: string;
  items: { name: string; size: string; milk: string; price: number }[];
  total: number;
  customerName?: string;
}) {
  const subject = `Order Confirmed — ${ctx.cafeName} ☕`;

  const itemRows = ctx.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0; border-bottom:1px solid #f5f5f4;">${escapeHtml(i.name)} <span style="color:#78716c; font-size:13px;">(${escapeHtml(i.size)}${i.milk !== 'Regular' ? ', ' + escapeHtml(i.milk) : ''})</span></td><td style="padding:8px 0; border-bottom:1px solid #f5f5f4; text-align:right; font-weight:600;">$${i.price.toFixed(2)}</td></tr>`,
    )
    .join('');

  const html = emailWrapper(`
    <h2 style="color:${BRAND_ORANGE}; margin-top:0;">Order Confirmed ✓</h2>

    <p>Hi${ctx.customerName ? ' <strong>' + escapeHtml(ctx.customerName) + '</strong>' : ''},</p>

    <p>Your order at <strong>${escapeHtml(ctx.cafeName)}</strong> has been placed!</p>

    <div style="background:#fafaf9; border-radius:12px; padding:16px; margin:16px 0;">
      <p style="margin:0 0 4px; font-size:12px; color:#78716c; text-transform:uppercase; letter-spacing:1px; font-weight:700;">Order #${escapeHtml(ctx.orderId.slice(-6).toUpperCase())}</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        ${itemRows}
        <tr><td style="padding:10px 0 0; font-weight:700;">Total</td><td style="padding:10px 0 0; text-align:right; font-weight:700; font-size:16px; color:${BRAND_ORANGE};">$${ctx.total.toFixed(2)}</td></tr>
      </table>
    </div>

    <h3 style="color:${BRAND_DARK};">What happens next?</h3>
    <ol style="padding-left:18px;">
      <li>The cafe will <strong>accept</strong> your order (you'll get an SMS)</li>
      <li>Drive to the cafe when you get the "ready" notification</li>
      <li>Roll up, and your coffee will be brought to your car!</li>
    </ol>

    <p style="font-size:13px; color:#78716c;">Payment is held until the cafe confirms. If they can't fulfill your order, you won't be charged.</p>

    ${signoff}
  `);

  const itemsText = ctx.items.map((i) => `  - ${i.name} (${i.size}${i.milk !== 'Regular' ? ', ' + i.milk : ''}) — $${i.price.toFixed(2)}`).join('\n');

  const text = `Order Confirmed!

Hi${ctx.customerName ? ' ' + ctx.customerName : ''},

Your order at ${ctx.cafeName} has been placed.

Order #${ctx.orderId.slice(-6).toUpperCase()}
${itemsText}
Total: $${ctx.total.toFixed(2)}

What happens next?
1. The cafe will accept your order (you'll get an SMS)
2. Drive to the cafe when you get the "ready" notification
3. Roll up, and your coffee will be brought to your car!

Payment is held until the cafe confirms. If they can't fulfill your order, you won't be charged.

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 3. ORDER READY FOR PICKUP ────────────────────────────── */

export function buildOrderReadyEmail(ctx: {
  orderId: string;
  cafeName: string;
  customerName?: string;
}) {
  const subject = `Your order is READY! 🚗 — ${ctx.cafeName}`;

  const html = emailWrapper(`
    <div style="text-align:center; margin-bottom:20px;">
      <div style="display:inline-block; background:#dcfce7; border-radius:50%; width:64px; height:64px; line-height:64px; font-size:32px;">✅</div>
    </div>

    <h2 style="color:#16a34a; margin-top:0; text-align:center;">Your Order is Ready!</h2>

    <p style="text-align:center;">Hi${ctx.customerName ? ' <strong>' + escapeHtml(ctx.customerName) + '</strong>' : ''}, your order at <strong>${escapeHtml(ctx.cafeName)}</strong> is ready for pickup.</p>

    <p style="text-align:center; font-size:13px; color:#78716c;">Order #${escapeHtml(ctx.orderId.slice(-6).toUpperCase())}</p>

    <div style="text-align:center; margin:24px 0; padding:20px; background:#fef9c3; border-radius:12px;">
      <p style="margin:0; font-weight:700; font-size:16px;">🚗 Drive up now!</p>
      <p style="margin:4px 0 0; font-size:13px; color:#78716c;">The cafe is waiting for you. Your coffee's hot!</p>
    </div>

    ${signoff}
  `);

  const text = `Your Order is Ready!

Hi${ctx.customerName ? ' ' + ctx.customerName : ''}, your order at ${ctx.cafeName} is ready for pickup!

Order #${ctx.orderId.slice(-6).toUpperCase()}

Drive up now! The cafe is waiting for you.

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 4. ORDER DECLINED / CANCELLED ────────────────────────── */

export function buildOrderDeclinedEmail(ctx: {
  orderId: string;
  cafeName: string;
  customerName?: string;
  reason?: string;
}) {
  const subject = `Order Update — ${ctx.cafeName}`;

  const html = emailWrapper(`
    <h2 style="color:#dc2626; margin-top:0;">Order Could Not Be Fulfilled</h2>

    <p>Hi${ctx.customerName ? ' <strong>' + escapeHtml(ctx.customerName) + '</strong>' : ''},</p>

    <p>Unfortunately, <strong>${escapeHtml(ctx.cafeName)}</strong> was unable to fulfill your order <strong>#${escapeHtml(ctx.orderId.slice(-6).toUpperCase())}</strong>.</p>

    ${ctx.reason ? `<p style="font-size:13px; color:#78716c;">Reason: ${escapeHtml(ctx.reason)}</p>` : ''}

    <div style="background:#fef2f2; border-radius:12px; padding:16px; margin:16px 0;">
      <p style="margin:0; font-weight:600;">💳 No charge</p>
      <p style="margin:4px 0 0; font-size:13px; color:#78716c;">Your payment hold has been <strong>released</strong>. You have not been charged.</p>
    </div>

    <p>We're sorry about the inconvenience. You can place a new order anytime!</p>

    <p style="text-align:center; margin:20px 0;">
      ${btn('ORDER AGAIN', 'https://pullupcoffee.com')}
    </p>

    ${signoff}
  `);

  const text = `Order Could Not Be Fulfilled

Hi${ctx.customerName ? ' ' + ctx.customerName : ''},

Unfortunately, ${ctx.cafeName} was unable to fulfill your order #${ctx.orderId.slice(-6).toUpperCase()}.
${ctx.reason ? 'Reason: ' + ctx.reason + '\n' : ''}
No charge — your payment hold has been released. You have not been charged.

You can place a new order anytime at https://pullupcoffee.com

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 5. ONBOARDING FOLLOW-UP (Day 3 — no orders yet) ─────── */

export function buildOnboardingNudgeEmail(ctx: {
  businessName: string;
  email: string;
}) {
  const subject = 'Get your first Pull Up order today! ☕';

  const html = emailWrapper(`
    <h2 style="color:${BRAND_ORANGE}; margin-top:0;">Let's Get You Your First Order!</h2>

    <p>Hi <strong>${escapeHtml(ctx.businessName)}</strong> Team,</p>

    <p>We noticed you haven't received orders yet. Let's fix that — most cafes get their first order within <strong>48 hours</strong> of going live!</p>

    <h3 style="color:${BRAND_DARK};">Quick Checklist</h3>
    <ul style="padding-left:18px; list-style:none;">
      <li>✅ Status set to <strong>"Open"</strong>? <em>(Operations tab)</em></li>
      <li>✅ Menu uploaded? <em>(7+ items is ideal)</em></li>
      <li>✅ Stripe connected? <em>(Payments tab)</em></li>
      <li>✅ QR poster displayed in-store? <em>(Download in Account tab)</em></li>
    </ul>

    <p><strong>Pro tip:</strong> The #1 driver of orders is the QR poster. Place it at the drive-through window, entrance, or counter where customers can scan and order from their car.</p>

    <p style="text-align:center; margin:24px 0;">
      ${btn('OPEN YOUR DASHBOARD', 'https://pullupcoffee.com')}
    </p>

    <p>Need a hand? Just reply to this email — I personally read every one.</p>

    ${signoff}
  `);

  const text = `Let's Get You Your First Order!

Hi ${ctx.businessName} Team,

We noticed you haven't received orders yet. Let's fix that!

Quick Checklist:
- Status set to "Open"? (Operations tab)
- Menu uploaded? (7+ items is ideal)
- Stripe connected? (Payments tab)
- QR poster displayed in-store? (Download in Account tab)

Pro tip: The #1 driver of orders is the QR poster. Place it at the drive-through, entrance, or counter.

Log in: https://pullupcoffee.com

Need a hand? Just reply to this email — I personally read every one.

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 6. WELCOME / SIGNUP RECEIVED (pre-approval) ─────────── */

export function buildSignupReceivedEmail(ctx: {
  businessName: string;
}) {
  const subject = "We've received your Pull Up Coffee application! ☕";

  const html = emailWrapper(`
    <h2 style="color:${BRAND_ORANGE}; margin-top:0;">Application Received!</h2>

    <p>Hi <strong>${escapeHtml(ctx.businessName)}</strong> Team,</p>

    <p>Thanks for applying to join <strong>Pull Up Coffee</strong> — Australia's curbside coffee platform.</p>

    <p>We're reviewing your application now. Most applications are approved within <strong>24 hours</strong>.</p>

    <div style="background:#fafaf9; border-radius:12px; padding:16px; margin:16px 0;">
      <p style="margin:0; font-weight:600;">What happens next?</p>
      <ul style="padding-left:18px; margin:8px 0 0; font-size:14px; color:#57534e;">
        <li>We'll review your details</li>
        <li>You'll receive an approval email + SMS</li>
        <li>Then you can set up your menu and start taking orders</li>
      </ul>
    </div>

    <p style="font-size:13px; color:#78716c;">Questions? Reply to this email — I read every one personally.</p>

    ${signoff}
  `);

  const text = `Application Received!

Hi ${ctx.businessName} Team,

Thanks for applying to join Pull Up Coffee — Australia's curbside coffee platform.

We're reviewing your application now. Most applications are approved within 24 hours.

What happens next?
- We'll review your details
- You'll receive an approval email + SMS
- Then you can set up your menu and start taking orders

Questions? Reply to this email.

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 7a. SUPPORT / DONATION THANK YOU (Coffee, Legend, VIP) ── */

export function buildSupportThankYouEmail(ctx: {
  customerName: string;
  customerEmail: string;
  tierName: string;
  amount: number;
  tier: string;
}) {
  const isVip = ctx.tier === 'vip';
  const subject = isVip
    ? 'Welcome to the VIP list! 🏆 — Pull Up Coffee'
    : 'Thank you for supporting Pull Up Coffee! ☕';

  const vipSection = isVip ? `
    <div style="background:#fefce8; border:1px solid #fef08a; border-radius:12px; padding:16px; margin:16px 0;">
      <p style="margin:0; font-weight:700; font-size:15px;">🏆 VIP Status Confirmed</p>
      <p style="margin:6px 0 0; font-size:13px; color:#78716c;">You're now on the official Pull Up VIP list. You'll receive exclusive event invites, free merch drops, and early access to new features.</p>
    </div>` : '';

  const html = emailWrapper(`
    <h2 style="color:${BRAND_ORANGE}; margin-top:0;">Thank You for Your Support! ☕</h2>

    <p>Hi <strong>${escapeHtml(ctx.customerName)}</strong>,</p>

    <p>Your support means the world. Every contribution goes directly toward platform development, hosting, and keeping things running for our partner cafes.</p>

    <div style="background:#fafaf9; border-radius:12px; padding:16px; margin:16px 0;">
      <table style="width:100%; font-size:14px;">
        <tr><td style="color:#78716c;">Contribution</td><td style="text-align:right; font-weight:600;">${escapeHtml(ctx.tierName)}</td></tr>
        <tr><td style="color:#78716c;">Amount</td><td style="text-align:right; font-weight:700; color:${BRAND_ORANGE};">$${ctx.amount.toFixed(2)} AUD</td></tr>
      </table>
    </div>

    ${vipSection}

    <p style="text-align:center; margin:24px 0;">
      ${btn('VISIT PULL UP COFFEE', 'https://pullupcoffee.com')}
    </p>

    <p style="font-size:13px; color:#78716c;">This is a digital contribution — no physical item will be shipped. If you have any questions, just reply to this email.</p>

    ${signoff}
  `);

  const text = `Thank You for Your Support!

Hi ${ctx.customerName},

Your support means the world. Every contribution goes directly toward platform development, hosting, and keeping things running for our partner cafes.

Contribution: ${ctx.tierName}
Amount: $${ctx.amount.toFixed(2)} AUD
${isVip ? '\n🏆 VIP Status Confirmed — you\'re now on the official Pull Up VIP list.\n' : ''}
This is a digital contribution — no physical item will be shipped.

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 7b. MERCH ORDER CONFIRMATION (Hat / Printful) ────────── */

export function buildMerchOrderEmail(ctx: {
  customerName: string;
  customerEmail: string;
  itemName: string;
  amount: number;
}) {
  const subject = 'Your Pull Up merch is on the way! 🧢';

  const html = emailWrapper(`
    <h2 style="color:${BRAND_ORANGE}; margin-top:0;">Merch Order Confirmed! 🧢</h2>

    <p>Hi <strong>${escapeHtml(ctx.customerName)}</strong>,</p>

    <p>Thanks for your purchase! Your <strong>${escapeHtml(ctx.itemName)}</strong> is being made and will ship soon.</p>

    <div style="background:#fafaf9; border-radius:12px; padding:16px; margin:16px 0;">
      <table style="width:100%; font-size:14px;">
        <tr><td style="color:#78716c;">Item</td><td style="text-align:right; font-weight:600;">${escapeHtml(ctx.itemName)}</td></tr>
        <tr><td style="color:#78716c;">Total</td><td style="text-align:right; font-weight:700; color:${BRAND_ORANGE};">$${ctx.amount.toFixed(2)} AUD</td></tr>
      </table>
    </div>

    <h3 style="color:${BRAND_DARK};">Shipping Info</h3>
    <ul style="padding-left:18px; font-size:14px; color:#57534e;">
      <li>Made to order by our print partner</li>
      <li>Ships within <strong>3–7 business days</strong></li>
      <li>Tracking email sent when dispatched</li>
    </ul>

    <p style="font-size:13px; color:#78716c;">Any issues? Reply to this email and we'll sort it out.</p>

    ${signoff}
  `);

  const text = `Merch Order Confirmed!

Hi ${ctx.customerName},

Thanks for your purchase! Your ${ctx.itemName} is being made and will ship soon.

Item: ${ctx.itemName}
Total: $${ctx.amount.toFixed(2)} AUD

Shipping Info:
- Made to order by our print partner
- Ships within 3-7 business days
- Tracking email sent when dispatched

Any issues? Reply to this email.

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

// ── Send helper ───────────────────────────────────────────────

/* ─── 8. PASSWORD RESET (branded) ──────────────────────────── */

export function buildPasswordResetEmail(email: string, resetLink: string) {
  const subject = 'Reset Your Pull Up Coffee Password 🔐';

  const html = emailWrapper(`
    <div style="text-align:center; margin-bottom:20px;">
      <div style="display:inline-block; background:#fef3c7; border-radius:50%; width:64px; height:64px; line-height:64px; font-size:32px;">🔐</div>
    </div>

    <h2 style="color:${BRAND_DARK}; margin-top:0; text-align:center;">Password Reset Request</h2>

    <p>Hi there,</p>

    <p>We received a request to reset the password for the account associated with <strong>${escapeHtml(email)}</strong>.</p>

    <p style="text-align:center; margin:28px 0;">
      ${btn('RESET MY PASSWORD', resetLink)}
    </p>

    <div style="background:#fafaf9; border-radius:12px; padding:16px; margin:16px 0;">
      <p style="margin:0; font-size:13px; color:#78716c;">
        ⏰ This link expires in <strong>1 hour</strong>.<br/>
        🔒 If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
    </div>

    <p style="font-size:13px; color:#78716c;">For security, this link can only be used once. If you need another reset, visit the login page and request a new link.</p>

    ${signoff}
  `);

  const text = `Password Reset Request

Hi there,

We received a request to reset the password for ${email}.

Reset your password: ${resetLink}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.

For security, this link can only be used once.

Cheers,
Steven
Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 9. AFFILIATE WELCOME EMAIL ───────────────────────────── */

export function buildAffiliateWelcomeEmail(ctx: {
  name: string;
  referralCode: string;
  email: string;
}) {
  const subject = `Welcome to the Pull Up Coffee Affiliate Program! 🤝`;
  const siteUrl = 'https://pullupcoffee.com';

  const html = emailWrapper(`
    <h2 style="color:${BRAND_ORANGE}; margin-top:0;">You're In! 🎉</h2>

    <p>Hi <strong>${escapeHtml(ctx.name)}</strong>,</p>

    <p>Your affiliate application has been <strong>approved</strong>. Here's everything you need to start earning:</p>

    <div style="background:#fef3c7; border:2px solid #f59e0b; border-radius:12px; padding:20px; margin:20px 0; text-align:center;">
      <p style="margin:0 0 8px; font-size:12px; color:#92400e; text-transform:uppercase; letter-spacing:2px; font-weight:700;">Your Referral Code</p>
      <p style="margin:0; font-size:28px; font-weight:900; color:#0f0f0f; letter-spacing:3px; font-family:monospace;">${escapeHtml(ctx.referralCode)}</p>
    </div>

    <h3 style="color:#0f0f0f; margin-top:24px;">How It Works</h3>
    <ol style="font-size:14px; color:#57534e; line-height:1.8;">
      <li><strong>Share your code</strong> with cafes, restaurants, and food businesses in your area</li>
      <li>When they <strong>sign up at ${siteUrl}</strong> and enter your referral code, they're linked to you</li>
      <li>You earn <strong>25% of the platform fee</strong> on every order for that business's <strong>first 30 calendar days</strong></li>
      <li>Also encourage <strong>customers</strong> to use those businesses — more customers = more orders = more commission for you</li>
    </ol>

    <h3 style="color:#0f0f0f; margin-top:24px;">Commission Example</h3>
    <p style="font-size:14px; color:#57534e;">Every order includes a flat $0.99 Pull Up Service Fee. You earn <strong>25% of that = ~$0.25 per order</strong>. The cafe keeps 100% of their menu prices + 100% of their curbside fee — your commission comes from the platform's share only. A busy cafe doing 50 orders/day = <strong>$12.50/day = $375 in your first month</strong> from just one cafe.</p>

    <h3 style="color:#0f0f0f; margin-top:24px;">Important Rules</h3>
    <ul style="font-size:13px; color:#57534e; line-height:1.8;">
      <li>Commission applies for <strong>30 calendar days</strong> from each cafe's first transaction</li>
      <li>All promotions must include affiliate disclosure: <em>"I earn a commission if you sign up via my link"</em></li>
      <li>No bots, spam, fake accounts, or misleading claims</li>
      <li>Breaches result in immediate termination and forfeiture of commissions</li>
    </ul>

    <p style="text-align:center; margin:28px 0;">
      ${btn('VISIT PULL UP COFFEE', siteUrl)}
    </p>

    <p style="font-size:13px; color:#78716c;">Questions? Reply to this email or contact <a href="mailto:hello@pullupcoffee.com" style="color:${BRAND_ORANGE};">hello@pullupcoffee.com</a></p>

    ${signoff}
  `);

  const text = `Welcome to the Pull Up Coffee Affiliate Program!

Hi ${ctx.name},

Your affiliate application has been approved!

YOUR REFERRAL CODE: ${ctx.referralCode}

How It Works:
1. Share your code with cafes and food businesses
2. When they sign up at ${siteUrl} and enter your code, they're linked to you
3. You earn 25% of the platform fee for their first 30 days
4. Encourage customers to order — more orders = more commission

Commission Example:
Every order includes a flat $0.99 Pull Up Service Fee. You earn ~$0.25 per order (25% of $0.99).
50 orders/day = $12.50/day = $375 in your first month from just one cafe.

Rules:
- 30 calendar day commission window per cafe
- Must include affiliate disclosure in promotions
- No spam, bots, or fake accounts

Visit: ${siteUrl}
Questions: hello@pullupcoffee.com

Cheers, Steven — Founder, Pull Up Coffee`;

  return { subject, html, text };
}

/* ─── 10. SURVEY EMAIL ─────────────────────────────────────── */

export function buildSurveyEmail(ctx: {
  businessName: string;
  surveyUrl?: string;
  period?: string;
  intro?: string;
  questions?: string[];
}) {
  const period = ctx.period || new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const subject = `📊 Pull Up Coffee — How are we doing? (${period})`;

  const questionsHtml = ctx.questions?.length
    ? `<ol style="margin:16px 0; padding-left:20px;">${ctx.questions.map(q => `<li style="margin-bottom:8px; font-size:14px; color:#44403c;">${escapeHtml(q)}</li>`).join('')}</ol>
       <p style="font-size:13px; color:#78716c;">Hit <strong>reply</strong> to this email with your answers — we read every response.</p>`
    : '';

  const surveyButton = ctx.surveyUrl
    ? `<p style="text-align:center; margin:24px 0;">${btn('TAKE THE SURVEY', ctx.surveyUrl)}</p>`
    : '';

  const introText = ctx.intro || 'You\'ve been part of Pull Up Coffee and we\'d love to hear how things are going. Your feedback directly shapes platform improvements.';

  const html = emailWrapper(`
    <h2 style="color:${BRAND_ORANGE}; margin-top:0;">We Value Your Feedback</h2>

    <p>Hi <strong>${escapeHtml(ctx.businessName)}</strong> Team,</p>

    <p>${escapeHtml(introText)}</p>

    ${questionsHtml}
    ${surveyButton}

    <p style="font-size:13px; color:#78716c;">Your responses are reviewed by our team and help us prioritize new features, fix issues, and improve the experience for everyone.</p>

    ${signoff}
  `);

  const questionsList = ctx.questions?.length
    ? ctx.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : '';

  const text = `Pull Up Coffee — Feedback Survey (${period})

Hi ${ctx.businessName} Team,

${introText}

${questionsList ? `Questions:\n${questionsList}\n\nJust reply to this email with your answers!\n` : ''}${ctx.surveyUrl ? `Take our 2-minute survey: ${ctx.surveyUrl}\n` : ''}
Your feedback directly shapes platform improvements.

Cheers, Steven — Founder, Pull Up Coffee`;

  return { subject, html, text };
}


interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
  simulated?: boolean;
}

export async function sendEmail(
  to: string,
  template: { subject: string; html: string; text: string },
): Promise<SendResult> {
  if (!resend) {
    console.log(`[EMAIL SIMULATION] To: ${to} | Subject: ${template.subject}`);
    return { success: true, id: 'SIMULATED', simulated: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[Resend] Send failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Resend] Unexpected error:', err);
    return { success: false, error: String(err) };
  }
}

// ── Utils ─────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
