import { prisma } from "@/lib/db/prisma";
import { formatSupplierCommand } from "./formatter";

export interface OutboundQueueOptions {
  /**
   * GramJS Telegram Client instance with a `sendMessage` method.
   * If omitted or null, messaging attempts will be simulated or skipped.
   */
  client?: {
    sendMessage: (
      peer: any,
      params: { message: string }
    ) => Promise<{ id?: number | string; [key: string]: any }>;
  } | null;
  /**
   * Target group string or entity for GramJS client.sendMessage().
   */
  targetGroup?: any;
  /**
   * Optional specific order ID to process (useful for test isolation).
   */
  orderId?: string;
}

export interface DispatchResult {
  orderId: string;
  orderNumber: string;
  formattedCommand: string;
  status: "DISPATCHED" | "SKIPPED_DISABLED" | "CLAIM_FAILED" | "SEND_FAILED" | "NO_CLIENT";
  telegramMessageId?: number | string;
  error?: string;
}

/**
 * Processes paid PROCESSING orders awaiting outbound Telegram command dispatch.
 * Enforces atomic database-level claiming via unique `idempotencyKey` on `ProviderLog`.
 */
export async function processOutboundQueue(
  options?: OutboundQueueOptions
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];

  const autoFulfillEnabled = process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED === "true";

  // 1. Find orders in PROCESSING status that have command snapshots and UIDs
  const whereCondition: any = {
    status: "PROCESSING",
    supplierCommandSnapshot: { not: null },
    freeFireUid: { not: "" },
    providerLogs: {
      none: {
        providerType: "TELEGRAM",
      },
    },
  };

  if (options?.orderId) {
    whereCondition.id = options.orderId;
  }

  const pendingOrders = await prisma.order.findMany({
    where: whereCondition,
    take: 10,
    orderBy: { createdAt: "asc" },
  });

  if (pendingOrders.length === 0) {
    return results;
  }

  for (const order of pendingOrders) {
    if (!order.supplierCommandSnapshot || !order.freeFireUid) continue;

    let formattedCommand = "";
    try {
      formattedCommand = formatSupplierCommand(
        order.supplierCommandSnapshot,
        order.freeFireUid
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Command formatting failed";
      console.error(`❌ Cannot format command for Order #${order.orderNumber}: ${errorMsg}`);
      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        formattedCommand: "",
        status: "SEND_FAILED",
        error: errorMsg,
      });
      continue;
    }

    const idempotencyKey = `tg_dispatch:${order.id}`;

    // 2. Atomic Database Claim: Create ProviderLog with unique idempotencyKey
    let claimLog;
    try {
      claimLog = await prisma.providerLog.create({
        data: {
          orderId: order.id,
          providerType: "TELEGRAM",
          idempotencyKey,
          request: JSON.stringify({
            status: "CLAIMED",
            formattedCommand,
            claimedAt: new Date().toISOString(),
          }),
          success: false,
          errorMessage: "DISPATCH_IN_PROGRESS",
        },
      });
    } catch (err: any) {
      // P2002: Unique constraint failed. Another process claimed this order concurrently.
      if (err.code === "P2002" || err.message?.includes("Unique constraint")) {
        console.log(`⚠️ Order #${order.orderNumber} already claimed by another worker. Skipping.`);
        results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          formattedCommand,
          status: "CLAIM_FAILED",
          error: "Already claimed by another worker",
        });
        continue;
      }
      throw err;
    }

    // 3. Safety Check: TELEGRAM_AUTO_FULFILLMENT_ENABLED
    if (!autoFulfillEnabled) {
      console.log(
        `ℹ️ [Outbound Queue] Auto-fulfillment disabled (TELEGRAM_AUTO_FULFILLMENT_ENABLED=false). Skipping dispatch for Order #${order.orderNumber}.`
      );

      await prisma.providerLog.update({
        where: { id: claimLog.id },
        data: {
          errorMessage: "SKIPPED_AUTO_FULFILLMENT_DISABLED",
        },
      });

      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        formattedCommand,
        status: "SKIPPED_DISABLED",
      });
      continue;
    }

    // 4. Send command via GramJS client
    if (!options?.client || !options?.targetGroup) {
      console.warn(
        `⚠️ [Outbound Queue] No active GramJS client/targetGroup provided. Cannot send command for Order #${order.orderNumber}.`
      );

      await prisma.providerLog.update({
        where: { id: claimLog.id },
        data: {
          errorMessage: "NO_TELEGRAM_CLIENT",
        },
      });

      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        formattedCommand,
        status: "NO_CLIENT",
        error: "No GramJS client provided",
      });
      continue;
    }

    try {
      console.log(
        `🚀 Transmitting outbound command "${formattedCommand}" for Order #${order.orderNumber}...`
      );
      const sentMsg = await options.client.sendMessage(options.targetGroup, {
        message: formattedCommand,
      });

      const messageId = sentMsg.id ?? `msg_${Date.now()}`;

      // Update ProviderLog on successful send
      await prisma.providerLog.update({
        where: { id: claimLog.id },
        data: {
          success: true,
          errorMessage: null,
          response: JSON.stringify({
            messageId,
            command: formattedCommand,
            targetGroup: String(options.targetGroup),
            sentAt: new Date().toISOString(),
          }),
        },
      });

      // Log OrderEvent
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: "PROCESSING",
          toStatus: "PROCESSING",
          note: `Outbound supplier command sent to Telegram: ${formattedCommand} (Message ID: ${messageId})`,
          triggeredBy: "TELEGRAM_WORKER",
        },
      });

      console.log(
        `✅ Successfully dispatched command for Order #${order.orderNumber} (Telegram Message ID: ${messageId})`
      );

      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        formattedCommand,
        status: "DISPATCHED",
        telegramMessageId: messageId,
      });
    } catch (sendErr) {
      const errorMsg =
        sendErr instanceof Error ? sendErr.message : "Failed to send Telegram message";
      console.error(`❌ Telegram send error for Order #${order.orderNumber}: ${errorMsg}`);

      await prisma.providerLog.update({
        where: { id: claimLog.id },
        data: {
          success: false,
          errorMessage: `SEND_FAILED: ${errorMsg}`,
          response: JSON.stringify({
            failedAt: new Date().toISOString(),
            error: errorMsg,
          }),
        },
      });

      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: "PROCESSING",
          toStatus: "PROCESSING",
          note: `Outbound supplier command transmission failed: ${errorMsg}`,
          triggeredBy: "TELEGRAM_WORKER",
        },
      });

      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        formattedCommand,
        status: "SEND_FAILED",
        error: errorMsg,
      });
    }
  }

  return results;
}
