import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, requireFirebaseAuth, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;

const client = sid && token ? twilio(sid, token) : null;

// SMS hard-cap: max 2 SMS per orderId to control costs
const ORDER_SMS_MAX = 2;
const orderSmsCounts = new Map<string, number>();

// Periodic cleanup — if instance survives it cleans up
if (typeof setInterval !== 'undefined') {
  setInterval(() => { if (orderSmsCounts.size > 5000) orderSmsCounts.clear(); }, 30 * 60 * 1000);
}

const normalizeAuNumber = (raw: string) => {
  const digits = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('04')) return `+61${digits.slice(1)}`;
  if (digits.startsWith('61')) return `+${digits}`;
  return digits;
};

// Only allow AU mobile numbers (+614XXXXXXXX) to prevent international toll fraud
const AU_MOBILE_RE = /^\+614\d{8}$/;

// Server-side SMS templates — only these messages can be sent
const SMS_TEMPLATES: Record<string, (ctx: Record<string, string>) => string> = {
  'order-ready':     (ctx) => `Pull Up Coffee: Your order ${ctx.orderId || ''} is ready for pickup! The cafe is waiting for you.`.trim(),
  'order-accepted':  (ctx) => `Pull Up Coffee: Great news! ${ctx.cafeName || 'Your cafe'} accepted your order. Heading your way.`.trim(),
  'order-declined':  (ctx) => `Pull Up Coffee: Sorry, ${ctx.cafeName || 'the cafe'} couldn't fulfill your order. Your hold has been released.`.trim(),
  'cafe-open':       (ctx) => `Pull Up Coffee: ${ctx.cafeName || 'A favourite cafe'} just opened! Order now for curbside pickup.`.trim(),
  'cafe-approved':   (ctx) => `Pull Up Coffee: Great news! ${ctx.businessName || 'Your business'} has been approved! Log in at pullupcoffee.com.au to set up your menu and go live. Welcome aboard! ☕🚗`.trim(),
};

// Export SMS templates & helpers for server-side use (e.g. admin approve route)
export { SMS_TEMPLATES, normalizeAuNumber, AU_MOBILE_RE };

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    // AUTHENTICATION REQUIRED — only signed-in users/cafe-owners can trigger SMS
    const authResult = await requireFirebaseAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const limited = checkRateLimit(req, 'twilio-send', 6, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ to: string; template: string; context?: Record<string, string>; orderId?: string }>(req);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { to, template, context: ctx, orderId } = body;
    if (!to || !template) {
      return NextResponse.json({ success: false, error: 'Missing to/template' }, { status: 400 });
    }

    // Template validation — prevent attacker-controlled message bodies
    const templateFn = SMS_TEMPLATES[template];
    if (!templateFn) {
      return NextResponse.json({ success: false, error: 'Unknown SMS template' }, { status: 400 });
    }
    const message = templateFn(ctx || {});

    // Enforce per-order SMS hard-cap
    if (orderId && typeof orderId === 'string') {
      const currentCount = orderSmsCounts.get(orderId) || 0;
      if (currentCount >= ORDER_SMS_MAX) {
        return NextResponse.json({ success: false, error: `SMS limit reached for this order (max ${ORDER_SMS_MAX})`, capped: true }, { status: 429 });
      }
      orderSmsCounts.set(orderId, currentCount + 1);
    }

    if (typeof to !== 'string' || to.length < 8 || to.length > 20) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
    }

    const normalizedTo = normalizeAuNumber(String(to));

    // Only allow Australian mobile numbers — block international toll fraud
    if (!AU_MOBILE_RE.test(normalizedTo)) {
      return NextResponse.json({ success: false, error: 'Only Australian mobile numbers are supported' }, { status: 400 });
    }

    if (!client || !from) {
      console.log(`[SMS SIMULATION] To: ${normalizedTo} | Template: ${template}`);
      return NextResponse.json({ success: true, sid: 'SIMULATED_SID', simulated: true });
    }

    const sms = await client.messages.create({
      to: normalizedTo,
      from,
      body: message,
    });

    return NextResponse.json({ success: true, sid: sms.sid, simulated: false });
  } catch (error: unknown) {
    console.error('Twilio send error:', error);
    return serverError('Unable to send SMS');
  }
}
