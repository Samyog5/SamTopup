import { prisma } from "@/lib/db/prisma";
import { refundWalletForOrder } from "@/server/services/wallet";
import type { ParsedSupplierMessage } from "./types";
import type { OrderStatus } from "@/generated/prisma/client";

export interface CorrelationResult {
  matched: boolean;
  orderId?: string;
  orderNumber?: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  reason?: string;
  refunded?: boolean;
}

/**
 * Correlates an incoming supplier response message from Telegram group "SR2298 Nepal"
 * to an internal Order and updates the order status atomically.
 *
 * State Transitions:
 * - Verified Success -> COMPLETED (sets completedAt & supplierOrderId)
 * - Explicit Failure -> Refund successful -> REFUNDED (atomic wallet refund)
 * - Explicit Failure -> Refund failed -> MANUAL_REVIEW
 * - Ambiguous Correlation / Unknown Message -> MANUAL_REVIEW (never automatically refunded)
 */
export async function correlateAndFulfillOrder(
  parsed: ParsedSupplierMessage,
  replyToMsgId?: number
): Promise<CorrelationResult> {
  let targetOrderId: string | null = null;
  let correlationMethod = "";

  // 1. Primary Correlation: Match via outbound Telegram message reply ID
  if (replyToMsgId) {
    const logs = await prisma.providerLog.findMany({
      where: {
        providerType: "TELEGRAM",
        orderId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const matchingLog = logs.find((l) => {
      if (!l.request) return false;
      try {
        const reqObj = JSON.parse(l.request);
        return reqObj.telegramMessageId === replyToMsgId;
      } catch {
        return false;
      }
    });

    if (matchingLog && matchingLog.orderId) {
      targetOrderId = matchingLog.orderId;
      correlationMethod = `Reply message ID #${replyToMsgId}`;
    }
  }

  // 2. Secondary Correlation: Match via Free Fire UID against PROCESSING orders
  if (!targetOrderId && parsed.freeFireUid) {
    const processingOrders = await prisma.order.findMany({
      where: {
        freeFireUid: parsed.freeFireUid,
        status: "PROCESSING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (processingOrders.length === 1) {
      targetOrderId = processingOrders[0].id;
      correlationMethod = `Free Fire Player UID match (${parsed.freeFireUid})`;
    } else if (processingOrders.length > 1) {
      // Ambiguous multiple orders for same UID -> pick newest but flag for review (NO automatic refund)
      targetOrderId = processingOrders[0].id;
      correlationMethod = `Multiple PROCESSING orders found for UID ${parsed.freeFireUid} (Ambiguous)`;
    }
  }

  if (!targetOrderId) {
    return {
      matched: false,
      reason: "No matching order found for supplier response",
    };
  }

  // Fetch the order
  const order = await prisma.order.findUnique({
    where: { id: targetOrderId },
  });

  if (!order) {
    return {
      matched: false,
      reason: `Order ${targetOrderId} not found in database`,
    };
  }

  // Determine new status based on parsed supplier message
  let newStatus: OrderStatus = "MANUAL_REVIEW";
  let eventNote = "";

  if (parsed.status === "SUCCESS") {
    if (correlationMethod.includes("Ambiguous")) {
      newStatus = "MANUAL_REVIEW";
      eventNote = `Ambiguous supplier response correlation for UID ${parsed.freeFireUid}. Marked for admin review.`;
    } else {
      newStatus = "COMPLETED";
      eventNote = `Verified supplier completion response (${parsed.supplierOrderId ?? "No ID"}). Delivered: ${parsed.deliveryStatus ?? "Yes"}`;
    }
  } else if (parsed.status === "FAILED") {
    newStatus = "FAILED";
    eventNote = `Supplier reported top-up failure for Player UID ${order.freeFireUid}`;
  } else {
    newStatus = "MANUAL_REVIEW";
    eventNote = `Unrecognized or ambiguous supplier response message: "${parsed.rawMessage.slice(0, 100)}..."`;
  }

  let isRefunded = false;

  if (newStatus === "FAILED") {
    try {
      // 1. Record provider log & initial FAILED event in database
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          supplierOrderId: parsed.supplierOrderId ?? order.supplierOrderId,
          providerData: JSON.stringify(parsed),
        },
      });

      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "FAILED",
          note: eventNote,
          triggeredBy: "TELEGRAM_PROVIDER",
        },
      });

      await prisma.providerLog.create({
        data: {
          orderId: order.id,
          providerType: "TELEGRAM",
          response: JSON.stringify(parsed),
          success: false,
          errorMessage: eventNote,
        },
      });

      // 2. Execute atomic wallet refund service operation
      const refundRes = await refundWalletForOrder(order.id, "Automatic refund for failed Free Fire top-up");
      isRefunded = refundRes.refunded || refundRes.duplicate;
      newStatus = "REFUNDED";
    } catch (err) {
      console.error(`Refund failed for order ${order.orderNumber}:`, err);
      newStatus = "MANUAL_REVIEW";
      eventNote = `Supplier failure detected but wallet refund failed: ${(err as Error).message}`;

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "MANUAL_REVIEW" },
      });

      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: "FAILED",
          toStatus: "MANUAL_REVIEW",
          note: eventNote,
          triggeredBy: "SYSTEM_REFUND",
        },
      });
    }
  } else {
    // Perform standard COMPLETED or MANUAL_REVIEW update
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          gamePlayerName: newStatus === "COMPLETED" ? (parsed.gamePlayerName ?? order.gamePlayerName) : order.gamePlayerName,
          supplierOrderId: parsed.supplierOrderId ?? order.supplierOrderId,
          providerData: JSON.stringify(parsed),
          completedAt: newStatus === "COMPLETED" ? new Date() : order.completedAt,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: newStatus,
          note: eventNote,
          triggeredBy: "TELEGRAM_PROVIDER",
        },
      });

      await tx.providerLog.create({
        data: {
          orderId: order.id,
          providerType: "TELEGRAM",
          response: JSON.stringify(parsed),
          success: newStatus === "COMPLETED",
          errorMessage: newStatus !== "COMPLETED" ? eventNote : null,
        },
      });
    });
  }

  return {
    matched: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    previousStatus: order.status,
    newStatus,
    reason: eventNote,
    refunded: isRefunded,
  };
}
