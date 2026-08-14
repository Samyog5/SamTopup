import dotenv from "dotenv";
import { getTelegramConfig, createTelegramClient } from "../src/server/providers/telegram/client";

dotenv.config();

/**
 * DISABLED: Manual Telegram message send script.
 * Direct message sending via scripts is disabled. Use telegram-test.ts for safe read-only connection testing.
 */
async function main() {
  console.log("==================================================");
  console.log(" SamTopup Telegram Send Script (DISABLED)         ");
  console.log("==================================================\n");

  console.error("❌ Manual Telegram send test script is disabled to prevent message transmission.");
  console.error("Please use `npx tsx scripts/telegram-test.ts` for safe read-only connection testing.");
  process.exit(1);
}

main().catch(console.error);

