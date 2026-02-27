const ACCESS_COOKIE_NAME = 'pullup_launch_access';
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 14;

const isProduction = process.env.NODE_ENV === 'production';

const getAccessCode = () => {
    const configuredCode = process.env.ACCESS_LOCK_CODE?.trim();
    if (configuredCode) return configuredCode;
    if (isProduction) {
        throw new Error('ACCESS_LOCK_CODE is required in production');
    }
    return '0905';
};

const getAccessSecret = () => {
    const configuredSecret = process.env.ACCESS_LOCK_SECRET?.trim();
    if (configuredSecret) {
        if (isProduction && configuredSecret.length < 32) {
            throw new Error('ACCESS_LOCK_SECRET must be at least 32 characters in production');
        }
        return configuredSecret;
    }

    if (isProduction) {
        throw new Error('ACCESS_LOCK_SECRET is required in production');
    }

    return 'change-this-access-lock-secret-before-public-launch';
};

const toHex = (bytes: Uint8Array) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');

const timingSafeEqual = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let index = 0; index < a.length; index += 1) {
        diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
    }
    return diff === 0;
};

const signValue = async (value: string) => {
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(getAccessSecret()),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(value));
    return toHex(new Uint8Array(signature));
};

const getNowEpochSeconds = () => Math.floor(Date.now() / 1000);

export const isAccessCodeValid = (submittedCode: string) => {
    const expected = getAccessCode();
    // Use constant-time comparison to prevent timing attacks
    return timingSafeEqual(submittedCode.trim(), expected);
};

export const createAccessToken = async () => {
    const issuedAt = `${getNowEpochSeconds()}`;
    const signature = await signValue(issuedAt);
    return `${issuedAt}.${signature}`;
};

export const verifyAccessToken = async (token: string) => {
    if (!token) return false;
    const [issuedAtRaw, providedSignature] = token.split('.');
    if (!issuedAtRaw || !providedSignature) return false;

    const issuedAt = Number.parseInt(issuedAtRaw, 10);
    if (!Number.isFinite(issuedAt)) return false;

    const now = getNowEpochSeconds();
    if (issuedAt > now + 300) return false;
    if (now - issuedAt > ACCESS_TTL_SECONDS) return false;

    const expectedSignature = await signValue(issuedAtRaw);
    return timingSafeEqual(providedSignature, expectedSignature);
};

export { ACCESS_COOKIE_NAME, ACCESS_TTL_SECONDS };
