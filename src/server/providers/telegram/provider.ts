import type { TopupProvider, TopupRequest, TopupResult, TopupStatus } from "../topup-provider";
import { formatSupplierCommand } from "./formatter";
import { parseSupplierResponse } from "./parser";
import { getTelegramConfig, createTelegramClient } from "./client";
import { prisma } from "@/lib/db/prisma";

export class TelegramTopupProvider implements TopupProvider {
  readonly name = "Telegram Reseller (@aslar55)";
  readonly type = "TELEGRAM" as const;

  /**
   * Format supplier command text for a given product command template and Free Fire UID.
   */
  formatCommand(template: string, freeFireUid: string): string {
    return formatSupplierCommand(template, freeFireUid);
  }

  /**
   * Parseraw supplier response text using the defensive parser.
   */
  parseResponse(messageText: string) {
    return parseSupplierResponse(messageText);
  }

  /**
   * Direct manual sendTopup is disabled.
   * Outbound fulfillment MUST be processed exclusively via the database-backed
   * queue `processOutboundQueue` in outbound-queue.ts.
   */
  async sendTopup(_request: TopupRequest): Promise<TopupResult> {
    const errorMsg = "Direct manual sendTopup is disabled. Outbound fulfillment is strictly handled via processOutboundQueue() for legitimate PROCESSING orders.";
    console.warn(`[TelegramProvider] ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }

  /**
   * Check status of a top-up request.
   */
  async checkStatus(reference: string): Promise<TopupStatus> {
    const log = await prisma.providerLog.findFirst({
      where: {
        providerType: "TELEGRAM",
        response: { contains: reference },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!log) {
      return { status: "PENDING" };
    }

    return {
      status: log.success ? "SUCCESS" : "FAILED",
      providerReference: reference,
      message: log.errorMessage ?? "Provider log found",
      updatedAt: log.createdAt,
    };
  }
}

export const telegramProvider = new TelegramTopupProvider();
