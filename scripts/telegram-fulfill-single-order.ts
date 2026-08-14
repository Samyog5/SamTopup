import "dotenv/config";
import dotenv from "dotenv";
import { NewMessage } from "telegram/events";
import { getTelegramConfig, createTelegramClient } from "../src/server/providers/telegram/client";
import { formatSupplierCommand } from "../src/server/providers/telegram/formatter";
import { parseSupplierResponse } from "../src/server/providers/telegram/parser";
import { correlateAndFulfillOrder, type CorrelationResult } from "../src/server/providers/telegram/correlator";
import { prisma } from "../src/lib/db/prisma";

dotenv.config();

const TARGET_ORDER_NUMBER = "ST-20260813-93985";

/**
 * DISABLED: Manual Telegram single order fulfillment script.
 * Manual single order Telegram fulfillment via scripts is disabled. Production Telegram supplier commands must ONLY be sent by the database-backed outbound fulfillment queue (outbound-queue.ts) for legitimate PROCESSING customer orders.
 */
async function main() {
  console.log("==================================================");
  console.log(" SamTopup Single Order Fulfillment Script (DISABLED)");
  console.log("==================================================\n");

  console.error("❌ Manual Telegram single order fulfillment script is disabled.");
  console.error("Outbound fulfillment is strictly handled via processOutboundQueue() in outbound-queue.ts.");
  process.exit(1);
}

main().catch(console.error);

