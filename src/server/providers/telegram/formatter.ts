/**
 * Formats a supplier command template by replacing the {uid} placeholder
 * with the customer's actual Free Fire Player UID.
 *
 * @example
 * formatSupplierCommand("bduc {uid} 115", "3125514892")
 * // => "bduc 3125514892 115"
 *
 * formatSupplierCommand("bduc {uid} weekly", "3125514892")
 * // => "bduc 3125514892 weekly"
 */
export function formatSupplierCommand(
  template: string,
  freeFireUid: string
): string {
  const trimmedUid = freeFireUid.trim();

  if (!trimmedUid) {
    throw new Error("Free Fire Player UID is required for supplier command formatting.");
  }

  if (!/^\d+$/.test(trimmedUid)) {
    throw new Error("Free Fire Player UID must contain only numeric digits.");
  }

  if (!template || !template.includes("{uid}")) {
    throw new Error("Supplier command template must contain the {uid} placeholder.");
  }

  return template.replace(/\{uid\}/g, trimmedUid).trim();
}
