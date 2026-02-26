import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;

const client = sid && token ? twilio(sid, token) : null;

// SMS hard-cap: max 2 SMS per orderId to control costs
const ORDER_SMS_MAX = 2;
const orderSmsCounts = new Map<string, number>();

// Clean up stale entries every 30 minutes
setInterval(() => {
  if (orderSmsCounts.size > 5000) orderSmsCounts.clear();
}, 30 * 60 * 1000);

const normalizeAuNumber = (raw: string) => {
  const digits = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('04')) return `+61${digits.slice(1)}`;
  if (digits.startsWith('61')) return `+${digits}`;
  return digits;
};

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'twilio-send', 8, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ to: string; message: string; orderId?: string }>(req);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { to, message, orderId } = body;
    if (!to || !message) {
      return NextResponse.json({ success: false, error: 'Missing to/message' }, { status: 400 });
    }

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

    if (typeof message !== 'string' || message.length < 1 || message.length > 1200) {
      return NextResponse.json({ success: false, error: 'Invalid message length' }, { status: 400 });
    }

    const normalizedTo = normalizeAuNumber(String(to));

    if (!client || !from) {
      console.log(`[SMS SIMULATION] To: ${normalizedTo} | Msg: ${message}`);
      return NextResponse.json({ success: true, sid: 'SIMULATED_SID', simulated: true });
    }

    const sms = await client.messages.create({
      to: normalizedTo,
      from,
      body: String(message).slice(0, 1200),
    });

    return NextResponse.json({ success: true, sid: sms.sid, simulated: false });
  } catch (error: unknown) {
    console.error('Twilio send error:', error);
    return serverError('Unable to send SMS');
  }
}
