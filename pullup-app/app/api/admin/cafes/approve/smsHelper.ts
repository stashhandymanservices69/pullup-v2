import twilio from 'twilio';

// Re-use the same env vars as the public Twilio route
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;

const client = sid && token ? twilio(sid, token) : null;

const normalizeAuNumber = (raw: string) => {
  const digits = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('04')) return `+61${digits.slice(1)}`;
  if (digits.startsWith('61')) return `+${digits}`;
  return digits;
};

const AU_MOBILE_RE = /^\+614\d{8}$/;

interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Send an approval SMS directly (server-side, no HTTP round-trip).
 * Used by the admin approve route so we don't need to auth against our own API.
 */
export async function sendApprovalSms(
  phone: string,
  businessName: string,
): Promise<SmsResult> {
  const normalizedTo = normalizeAuNumber(phone);

  if (!AU_MOBILE_RE.test(normalizedTo)) {
    // Not a valid AU mobile — skip silently (could be a landline)
    return { success: false, error: 'Not a valid AU mobile number, skipping SMS' };
  }

  const body = `Pull Up Coffee: Great news! ${businessName} has been approved! Log in at pullupcoffee.com.au to set up your menu and go live. Welcome aboard! ☕🚗`;

  if (!client || !from) {
    console.log(`[SMS SIMULATION] Approval SMS → ${normalizedTo}`);
    return { success: true, sid: 'SIMULATED_SID', simulated: true };
  }

  try {
    const sms = await client.messages.create({
      to: normalizedTo,
      from,
      body,
    });
    return { success: true, sid: sms.sid };
  } catch (err) {
    console.error('[Approval SMS] Send error:', err);
    return { success: false, error: String(err) };
  }
}
