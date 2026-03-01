// --- Pull Up Coffee: Internationalization Utilities ---
// Maps countries to Stripe-supported currencies and locale info

export interface CountryConfig {
  code: string;          // ISO 3166-1 alpha-2
  name: string;
  currency: string;      // ISO 4217 lowercase
  currencySymbol: string;
  locale: string;        // BCP 47 locale
  phonePrefix: string;
  legalJurisdiction: string;
  taxLabel: string;      // e.g. "GST", "VAT", "Sales Tax"
  taxNote: string;       // Brief legal tax note
  businessIdLabel: string; // e.g. "ABN", "EIN", "CRN"
  businessIdPlaceholder: string;
  insuranceMinimum: string; // Recommended minimum liability
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'AU', name: 'Australia', currency: 'aud', currencySymbol: '$',
    locale: 'en-AU', phonePrefix: '+61', legalJurisdiction: 'New South Wales, Australia',
    taxLabel: 'GST', taxNote: 'Prices include GST where applicable',
    businessIdLabel: 'ABN', businessIdPlaceholder: 'XX XXX XXX XXX',
    insuranceMinimum: 'AUD $10,000,000',
  },
  {
    code: 'US', name: 'United States', currency: 'usd', currencySymbol: '$',
    locale: 'en-US', phonePrefix: '+1', legalJurisdiction: 'State of Delaware, United States',
    taxLabel: 'Sales Tax', taxNote: 'Sales tax may apply depending on your state',
    businessIdLabel: 'EIN', businessIdPlaceholder: 'XX-XXXXXXX',
    insuranceMinimum: 'USD $1,000,000',
  },
  {
    code: 'GB', name: 'United Kingdom', currency: 'gbp', currencySymbol: '£',
    locale: 'en-GB', phonePrefix: '+44', legalJurisdiction: 'England and Wales',
    taxLabel: 'VAT', taxNote: 'Prices include VAT where applicable',
    businessIdLabel: 'CRN', businessIdPlaceholder: 'XXXXXXXX',
    insuranceMinimum: 'GBP £5,000,000',
  },
  {
    code: 'NZ', name: 'New Zealand', currency: 'nzd', currencySymbol: '$',
    locale: 'en-NZ', phonePrefix: '+64', legalJurisdiction: 'New Zealand',
    taxLabel: 'GST', taxNote: 'Prices include GST where applicable',
    businessIdLabel: 'NZBN', businessIdPlaceholder: 'XXXXXXXXXXXXX',
    insuranceMinimum: 'NZD $2,000,000',
  },
  {
    code: 'CA', name: 'Canada', currency: 'cad', currencySymbol: '$',
    locale: 'en-CA', phonePrefix: '+1', legalJurisdiction: 'Province of Ontario, Canada',
    taxLabel: 'HST/GST', taxNote: 'HST/GST may apply depending on your province',
    businessIdLabel: 'BN', businessIdPlaceholder: 'XXXXXXXXX',
    insuranceMinimum: 'CAD $2,000,000',
  },
  {
    code: 'IE', name: 'Ireland', currency: 'eur', currencySymbol: '€',
    locale: 'en-IE', phonePrefix: '+353', legalJurisdiction: 'Republic of Ireland',
    taxLabel: 'VAT', taxNote: 'Prices include VAT where applicable',
    businessIdLabel: 'CRO', businessIdPlaceholder: 'XXXXXX',
    insuranceMinimum: 'EUR €6,500,000',
  },
  {
    code: 'DE', name: 'Germany', currency: 'eur', currencySymbol: '€',
    locale: 'de-DE', phonePrefix: '+49', legalJurisdiction: 'Federal Republic of Germany',
    taxLabel: 'MwSt', taxNote: 'Preise inkl. MwSt. / Prices include VAT',
    businessIdLabel: 'HRB', businessIdPlaceholder: 'HRB XXXXX',
    insuranceMinimum: 'EUR €5,000,000',
  },
  {
    code: 'FR', name: 'France', currency: 'eur', currencySymbol: '€',
    locale: 'fr-FR', phonePrefix: '+33', legalJurisdiction: 'French Republic',
    taxLabel: 'TVA', taxNote: 'Prix TTC / Prices include VAT',
    businessIdLabel: 'SIRET', businessIdPlaceholder: 'XXX XXX XXX XXXXX',
    insuranceMinimum: 'EUR €5,000,000',
  },
  {
    code: 'SG', name: 'Singapore', currency: 'sgd', currencySymbol: '$',
    locale: 'en-SG', phonePrefix: '+65', legalJurisdiction: 'Republic of Singapore',
    taxLabel: 'GST', taxNote: 'Prices include GST where applicable',
    businessIdLabel: 'UEN', businessIdPlaceholder: 'XXXXXXXXX',
    insuranceMinimum: 'SGD $1,000,000',
  },
  {
    code: 'JP', name: 'Japan', currency: 'jpy', currencySymbol: '¥',
    locale: 'ja-JP', phonePrefix: '+81', legalJurisdiction: 'Japan',
    taxLabel: 'Consumption Tax', taxNote: 'Prices include consumption tax',
    businessIdLabel: 'Corporate No.', businessIdPlaceholder: 'XXXXXXXXXXXXX',
    insuranceMinimum: 'JPY ¥100,000,000',
  },
];

/** Get country config by ISO code — falls back to Australia */
export function getCountryConfig(countryCode: string): CountryConfig {
  return SUPPORTED_COUNTRIES.find(c => c.code === countryCode.toUpperCase()) || SUPPORTED_COUNTRIES[0];
}

/** Get currency code from country code */
export function getCurrency(countryCode: string): string {
  return getCountryConfig(countryCode).currency;
}

/** Get currency symbol from country code */
export function getCurrencySymbol(countryCode: string): string {
  return getCountryConfig(countryCode).currencySymbol;
}

/** Format price for display with locale-aware formatting */
export function formatPrice(amountCents: number, countryCode: string = 'AU'): string {
  const config = getCountryConfig(countryCode);
  // JPY has no decimal subdivision
  if (config.currency === 'jpy') {
    return `${config.currencySymbol}${amountCents}`;
  }
  return `${config.currencySymbol}${(amountCents / 100).toFixed(2)}`;
}

/** Detect country from browser locale (client-side only) */
export function detectCountry(): string {
  if (typeof navigator === 'undefined') return 'AU';
  const locale = navigator.language || 'en-AU';
  const parts = locale.split('-');
  const countryFromLocale = parts.length > 1 ? parts[1].toUpperCase() : '';
  // Check if we support this country
  if (SUPPORTED_COUNTRIES.find(c => c.code === countryFromLocale)) {
    return countryFromLocale;
  }
  // Try timezone-based detection as fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzCountryMap: Record<string, string> = {
      'Australia': 'AU', 'America': 'US', 'Europe/London': 'GB',
      'Pacific/Auckland': 'NZ', 'Canada': 'CA', 'Europe/Dublin': 'IE',
      'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Asia/Singapore': 'SG',
      'Asia/Tokyo': 'JP',
    };
    for (const [key, code] of Object.entries(tzCountryMap)) {
      if (tz.includes(key)) return code;
    }
  } catch { /* ignore */ }
  return 'AU'; // Default
}
