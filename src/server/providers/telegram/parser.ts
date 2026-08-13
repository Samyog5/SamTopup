import type { ParsedSupplierMessage, SupplierMessageStatus } from "./types";

/**
 * Defensive parser for supplier Telegram messages.
 * Parses raw text messages sent by resellers in group chat "SR2298 Nepal".
 *
 * Does NOT throw errors if fields are missing or if text does not match standard patterns.
 * Returns { status: "UNKNOWN", ... } if unclassifiable.
 */
export function parseSupplierResponse(messageText: string): ParsedSupplierMessage {
  const raw = messageText ?? "";
  const textUpper = raw.toUpperCase();

  // 1. Determine Status
  let status: SupplierMessageStatus = "UNKNOWN";

  const isSuccessKeyword =
    textUpper.includes("TOPUP DONE") ||
    textUpper.includes("DELIVERED") ||
    textUpper.includes("TOPUP COMPLETED") ||
    textUpper.includes("SUCCESS");

  const isFailedKeyword =
    textUpper.includes("FAILED") ||
    textUpper.includes("CANCELLED") ||
    textUpper.includes("REJECTED") ||
    textUpper.includes("INVALID UID") ||
    textUpper.includes("WRONG UID") ||
    textUpper.includes("INSUFFICIENT") ||
    textUpper.includes("SERVER ERROR");

  if (isSuccessKeyword && !isFailedKeyword) {
    status = "SUCCESS";
  } else if (isFailedKeyword) {
    status = "FAILED";
  }

  // 2. Extract Supplier Order ID (e.g., "Order ID : #6525" or "#6525")
  let supplierOrderId: string | null = null;
  const orderIdMatch = raw.match(/Order\s*ID\s*:\s*#?([A-Za-z0-9_-]+)/i) || raw.match(/#(\d{4,10})/);
  if (orderIdMatch && orderIdMatch[1]) {
    supplierOrderId = `#${orderIdMatch[1]}`;
  }

  // 3. Extract Free Fire UID (e.g., "UID : 3125514892" or "Player UID: 3125514892")
  let freeFireUid: string | null = null;
  const uidMatch = raw.match(/UID\s*:\s*(\d{5,20})/i) || raw.match(/Player\s*UID\s*:\s*(\d{5,20})/i);
  if (uidMatch && uidMatch[1]) {
    freeFireUid = uidMatch[1];
  }

  // 4. Extract Free Fire In-Game Player Name (e.g. "User : SMUGGLER")
  let gamePlayerName: string | null = null;
  const userMatch = raw.match(/^User\s*:\s*(.+)$/im) || raw.match(/User\s*:\s*([^\n\r]+)/i);
  if (userMatch && userMatch[1]) {
    const candidate = userMatch[1].trim();
    if (candidate && !candidate.toUpperCase().startsWith("UID")) {
      gamePlayerName = candidate;
    }
  }

  // 5. Extract Package Name (e.g., "Package : 20 Unipin Code × 1")
  let packageName: string | null = null;
  const packageMatch = raw.match(/Package\s*:\s*(.+)/i);
  if (packageMatch && packageMatch[1]) {
    packageName = packageMatch[1].trim();
  }

  // 6. Extract Delivery Status (e.g., "Delivered")
  let deliveryStatus: string | null = null;
  const deliveryMatch = raw.match(/(Delivered|Failed|Pending|Processing|Cancelled)/i);
  if (deliveryMatch && deliveryMatch[1]) {
    deliveryStatus = deliveryMatch[1].trim();
  }

  return {
    status,
    supplierOrderId,
    freeFireUid,
    gamePlayerName,
    packageName,
    deliveryStatus,
    rawMessage: raw,
  };
}
