/**
 * Money utility module for SamTopup
 *
 * All internal monetary values are stored in paisa (smallest NPR unit).
 * 1 NPR = 100 paisa
 *
 * RULES:
 * - Never use floating-point arithmetic for money calculations.
 * - Always store/transmit amounts as integer paisa.
 * - Only convert to display format (rupees) at the UI boundary.
 */

/**
 * Convert paisa (integer) to rupees string for display.
 * Example: 12550 → "125.50"
 */
export function paisaToRupees(paisa: number): string {
  const rupees = Math.floor(paisa / 100);
  const remainingPaisa = Math.abs(paisa % 100);
  return `${rupees}.${remainingPaisa.toString().padStart(2, "0")}`;
}

/**
 * Convert a rupee amount (number) to paisa (integer).
 * Rounds to avoid floating-point artifacts.
 * Example: 125.50 → 12550
 */
export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format paisa as a display-ready NPR string.
 * Example: 12550 → "Rs. 125.50"
 * Example: 1250050 → "Rs. 12,500.50"
 */
export function formatNPR(paisa: number): string {
  const rupees = Math.floor(Math.abs(paisa) / 100);
  const remainingPaisa = Math.abs(paisa % 100);
  const sign = paisa < 0 ? "-" : "";

  // Format with thousand separators using Nepali/Indian numbering
  const formattedRupees = rupees.toLocaleString("en-IN");

  return `${sign}Rs. ${formattedRupees}.${remainingPaisa.toString().padStart(2, "0")}`;
}

/**
 * Validate that a value is a safe integer for paisa operations.
 */
export function isValidPaisa(value: number): boolean {
  return Number.isInteger(value) && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Add two paisa values safely.
 */
export function addPaisa(a: number, b: number): number {
  return a + b;
}

/**
 * Subtract paisa values safely (a - b).
 */
export function subtractPaisa(a: number, b: number): number {
  return a - b;
}
