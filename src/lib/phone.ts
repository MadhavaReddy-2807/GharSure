/**
 * Phone number validation and normalization utilities for GharSure (India +91)
 */

export function normalizeIndianPhone(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  // Remove all non-digit characters except leading plus
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, "");

  // Handle +91 prefix
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // An Indian mobile number must be exactly 10 digits and start with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return null;
  }

  return `+91${cleaned}`;
}

export function isValidIndianPhone(input: string): boolean {
  return normalizeIndianPhone(input) !== null;
}

export function formatPhoneDisplay(phoneE164: string): string {
  const normalized = normalizeIndianPhone(phoneE164);
  if (!normalized) return phoneE164;

  // +91XXXXXXXXXX -> +91 XXXXX XXXXX
  const num = normalized.slice(3);
  return `+91 ${num.slice(0, 5)} ${num.slice(5)}`;
}

export function maskPhone(phoneE164: string): string {
  const normalized = normalizeIndianPhone(phoneE164);
  if (!normalized) return phoneE164;

  const num = normalized.slice(3); // 10 digits
  // Format as +91 98*** ***10
  return `+91 ${num.slice(0, 2)}*** ***${num.slice(8)}`;
}
