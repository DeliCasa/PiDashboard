/**
 * MAC address utility functions.
 */

const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$/;

/**
 * Normalize MAC address to uppercase with colons.
 */
export function normalizeMac(mac: string): string {
  // Remove all separators and convert to uppercase
  const clean = mac.replace(/[:-]/g, '').toUpperCase();
  // Insert colons every 2 characters
  return clean.match(/.{2}/g)?.join(':') ?? clean;
}

/**
 * Validate MAC address format.
 */
export function isValidMac(mac: string): boolean {
  return MAC_REGEX.test(mac);
}
