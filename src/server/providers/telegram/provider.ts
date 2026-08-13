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
   * Send a top-up request to the reseller group "SR2298 Nepal" via GramJS MTProto client.
   * Logs outbound ProviderLog entry.
   */
  async sendTopup(request: TopupRequest): Promise<TopupResult> {
    const config = getTelegramConfig();

    if (!config) {
      const errorMsg = "Telegram provider credentials (TELEGRAM_API_ID / TELEGRAM_SESSION) are not configured.";
      // Audit log attempt
      if (request.orderId) {
        await prisma.providerLog.create({
          data: {
            orderId: request.orderId,
            providerType: "TELEGRAM",
            request: JSON.stringify(request),
            success: false,
            errorMessage: errorMsg,
          },
        });
      }

      return {
        success: false,
        message: errorMsg,
      };
    }

    const formattedCommand = formatSupplierCommand(request.productSku, request.gameUid);
    const client = createTelegramClient(config);

    try {
      await client.connect();

      const sentMsg = await client.sendMessage(config.targetGroup, {
        message: formattedCommand,
      });

      const providerRef = sentMsg.id ? sentMsg.id.toString() : `msg_${Date.now()}`;

      // Log success outbound attempt in ProviderLog
      if (request.orderId) {
        await prisma.providerLog.create({
          data: {
            orderId: request.orderId,
            providerType: "TELEGRAM",
            request: JSON.stringify({
              formattedCommand,
              targetGroup: config.targetGroup,
              telegramMessageId: sentMsg.id,
            }),
            success: true,
          },
        });
      }

      await client.disconnect();

      return {
        success: true,
        providerReference: providerRef,
        message: `Command sent to ${config.targetGroup}: ${formattedCommand}`,
        rawResponse: JSON.stringify({ messageId: sentMsg.id, command: formattedCommand }),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send Telegram message";

      if (request.orderId) {
        await prisma.providerLog.create({
          data: {
            orderId: request.orderId,
            providerType: "TELEGRAM",
            request: JSON.stringify({ formattedCommand, targetGroup: config.targetGroup }),
            success: false,
            errorMessage,
          },
        });
      }

      try {
        await client.disconnect();
      } catch {
        // ignore disconnect errors
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
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
