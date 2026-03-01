import { NextResponse } from 'next/server';
import { requireAllowedOrigin, requireJsonContentType, checkRateLimit, parseJson, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';

/**
 * ABN Verification API
 * Uses the Australian Business Register (ABR) public JSON lookup.
 * Free, no API key required — returns business name, status, postcode, state.
 */

const ABR_LOOKUP_URL = 'https://abr.business.gov.au/json/AbnDetails.aspx';

interface AbnResult {
  valid: boolean;
  abn?: string;
  entityName?: string;
  status?: string;
  type?: string;
  postcode?: string;
  state?: string;
  error?: string;
}

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'verify-abn', 10, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ abn: string }>(req);
    if (!body?.abn) {
      return NextResponse.json({ valid: false, error: 'ABN is required' }, { status: 400 });
    }

    // Strip spaces and non-digits
    const cleanAbn = body.abn.replace(/\D/g, '');
    if (cleanAbn.length !== 11) {
      return NextResponse.json({ valid: false, error: 'ABN must be 11 digits' }, { status: 400 });
    }

    // ABN checksum validation (Australian algorithm)
    if (!isValidAbnChecksum(cleanAbn)) {
      return NextResponse.json({ valid: false, error: 'Invalid ABN checksum' }, { status: 400 });
    }

    // Lookup against ABR
    const callbackName = `abn_${Date.now()}`;
    const url = `${ABR_LOOKUP_URL}?abn=${cleanAbn}&callback=${callbackName}`;

    const res = await fetch(url, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[ABN Verify] ABR returned ${res.status}`);
      return NextResponse.json({ valid: false, error: 'ABR lookup failed' }, { status: 502 });
    }

    const raw = await res.text();

    // ABR returns JSONP: callback({...})
    // Extract JSON from the JSONP wrapper
    const jsonStart = raw.indexOf('(');
    const jsonEnd = raw.lastIndexOf(')');
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ valid: false, error: 'Unexpected ABR response format' }, { status: 502 });
    }

    const jsonStr = raw.slice(jsonStart + 1, jsonEnd);
    const data = JSON.parse(jsonStr);

    if (data.Message) {
      // ABR returned an error
      return NextResponse.json({ valid: false, error: data.Message });
    }

    const abnData = data;
    const entityName = abnData.EntityName || abnData.BusinessName?.[0]?.Name || '';
    const status = abnData.AbnStatus || '';
    const entityType = abnData.EntityTypeName || '';
    const mainBusinessLocation = abnData.AddressPostcode || '';
    const state = abnData.AddressState || '';

    const isActive = status.toLowerCase() === 'active';

    const result: AbnResult = {
      valid: isActive,
      abn: cleanAbn,
      entityName,
      status,
      type: entityType,
      postcode: mainBusinessLocation,
      state,
    };

    if (!isActive) {
      result.error = `ABN status is "${status}" — must be "Active"`;
    }

    console.log(`[ABN Verify] ABN ${cleanAbn}: ${entityName} — ${status}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ABN Verify] Error:', error);
    return serverError('ABN verification failed');
  }
}

/**
 * Validates ABN using the official Australian checksum algorithm.
 * 1. Subtract 1 from the first digit
 * 2. Multiply each digit by its weight: [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
 * 3. Sum all products — must be divisible by 89
 */
function isValidAbnChecksum(abn: string): boolean {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = abn.split('').map(Number);
  digits[0] -= 1; // Subtract 1 from first digit
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  return sum % 89 === 0;
}
