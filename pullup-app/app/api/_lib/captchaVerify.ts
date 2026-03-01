/**
 * Server-side reCAPTCHA verification
 *
 * Verifies a reCAPTCHA v2 token against Google's siteverify API.
 * This MUST be called server-side — the secret key is never exposed to clients.
 *
 * Without this, reCAPTCHA is only a visual client-side gate that bots
 * can bypass entirely by skipping the token.
 */

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY?.trim();
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

interface CaptchaResult {
  success: boolean;
  score?: number;
  error?: string;
}

/**
 * Verify a reCAPTCHA token server-side.
 *
 * @param token  The `g-recaptcha-response` token from the client
 * @param remoteIp  Optional client IP for additional verification
 * @returns CaptchaResult with success boolean
 */
export async function verifyCaptcha(
  token: string,
  remoteIp?: string,
): Promise<CaptchaResult> {
  if (!RECAPTCHA_SECRET) {
    // No secret configured — allow through but log warning
    console.warn('[CAPTCHA] RECAPTCHA_SECRET_KEY not set — skipping server-side verification');
    return { success: true, error: 'no_secret_configured' };
  }

  if (!token || typeof token !== 'string' || token.length < 20) {
    return { success: false, error: 'invalid_token' };
  }

  try {
    const params = new URLSearchParams({
      secret: RECAPTCHA_SECRET,
      response: token,
    });

    if (remoteIp) {
      params.set('remoteip', remoteIp);
    }

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error(`[CAPTCHA] Google siteverify returned ${res.status}`);
      return { success: false, error: `siteverify_http_${res.status}` };
    }

    const data = await res.json();

    if (!data.success) {
      console.warn('[CAPTCHA] Verification failed:', data['error-codes']);
      return { success: false, error: (data['error-codes'] || []).join(', ') };
    }

    return { success: true, score: data.score };
  } catch (err) {
    console.error('[CAPTCHA] Verification error:', err);
    // On network failure, fail open to avoid blocking legitimate users
    // but log aggressively for monitoring
    return { success: false, error: 'network_error' };
  }
}
