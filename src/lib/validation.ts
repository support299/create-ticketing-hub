/**
 * Validates a phone number: must start with + followed by digits, min 7 digits.
 */
export function isValidPhone(phone: string): boolean {
  return /^\+\d{7,15}$/.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * Validates an email address.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
