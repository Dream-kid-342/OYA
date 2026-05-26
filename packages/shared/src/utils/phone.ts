/**
 * Phone number utility for Kenyan numbers.
 * Normalizes all formats to E.164: +2547XXXXXXXX
 */

const VALID_KENYAN_PREFIXES = [
  // All 07XX numbers (Safaricom, Airtel, Telkom, Equitel, Faiba)
  '+2547',
  // All newer 01XX numbers (Safaricom 011X, Airtel 010X)
  '+2541',
];

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Normalize a Kenyan phone number to E.164 format (+2547XXXXXXXX).
 * Accepts: 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
 */
export function normalizeKenyanPhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  let cleaned = phone.trim().replace(/\s+/g, '');

  // Strip leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Convert 07XXXXXXXX → 2547XXXXXXXX
  if (/^0[0-9]{9}$/.test(cleaned)) {
    cleaned = '254' + cleaned.substring(1);
  }

  // Now cleaned should be 2547XXXXXXXX (12 digits)
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'Phone number must contain digits only' };
  }

  if (cleaned.length !== 12) {
    return {
      valid: false,
      error: `Invalid phone number length: expected 12 digits, got ${cleaned.length}`,
    };
  }

  const e164 = '+' + cleaned;

  // Validate prefix
  const prefixMatch = VALID_KENYAN_PREFIXES.some((prefix) =>
    e164.startsWith(prefix),
  );

  if (!prefixMatch) {
    return {
      valid: false,
      error: 'Invalid Kenyan mobile prefix. Must start with 07 or 01 (e.g. 07XX or 01XX)',
    };
  }

  return { valid: true, normalized: e164 };
}

/**
 * Validate a phone number and return normalized form or throw.
 */
export function validateAndNormalize(phone: string): string {
  const result = normalizeKenyanPhone(phone);
  if (!result.valid || !result.normalized) {
    const err: any = new Error(result.error ?? 'Invalid phone number');
    err.statusCode = 400;
    throw err;
  }
  return result.normalized;
}

/**
 * Mask phone for display: +254 7XX XXX X34
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  const normalized = phone.replace(/\D/g, '');
  const last4 = normalized.slice(-4);
  return `+${normalized.slice(0, 3)} 7XX XXX ${last4.slice(-2)}`;
}

/**
 * Validate Kenyan National ID: 7-8 digit numeric string.
 */
export function validateNationalId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'National ID is required' };
  }
  const cleaned = id.trim();
  if (!/^\d{7,8}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'National ID must be 7 or 8 digits',
    };
  }
  return { valid: true };
}

/**
 * Mask National ID: show last 4 digits
 */
export function maskNationalId(id: string): string {
  if (!id || id.length < 4) return 'XXXX';
  return `XX ${id.slice(-4)}`;
}
