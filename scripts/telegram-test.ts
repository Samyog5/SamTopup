import dotenv from "dotenv";
import { getTelegramConfig, createTelegramClient } from "../src/server/providers/telegram/client";
import { parseSupplierResponse } from "../src/server/providers/telegram/parser";

dotenv.config();

/**
 * Safe developer connection test script.
 * Verifies GramJS authentication, resolves target group "SR2298 Nepal",
 * reads recent group messages, and tests the defensive supplier parser.
 *
 * Usage:
 * npx tsx scripts/telegram-test.ts
 */
async function main() {
  console.log("==================================================");
  console.log(" SamTopup Telegram Connection Verification Test   ");
  console.log("==================================================\n");

  const config = getTelegramConfig();

  if (!config) {
    console.error("❌ Telegram environment configuration missing.");
    console.error("Please configure TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION in your .env file.");
    console.error("Run `npx tsx scripts/telegram-auth.ts` to generate your session string.");
    process.exit(1);
  }

  console.log(`Connecting as user account @aslar55...`);
  console.log(`Target group: ${config.targetGroup}`);

  const client = createTelegramClient(config);

  try {
    await client.connect();

    const me = await client.getMe();
    console.log("\n✅ Authenticated User Account:");
    console.log(`- ID: ${me.id}`);
    console.log(`- Name: ${me.firstName} ${me.lastName ?? ""}`);
    console.log(`- Username: @${me.username ?? "aslar55"}`);

    console.log(`\nFetching dialogs to resolve group "${config.targetGroup}"...`);
    const dialogs = await client.getDialogs({ limit: 100 });
    const targetDialog = dialogs.find(
      (d) => d.title?.toLowerCase() === config.targetGroup.toLowerCase() || d.name?.toLowerCase() === config.targetGroup.toLowerCase()
    );

    if (!targetDialog || !targetDialog.entity) {
      console.log(`Available user dialogs (${dialogs.length}):`);
      dialogs.forEach((d) => console.log(` - ${d.title || d.name || "Untitled"} (ID: ${d.id})`));
      throw new Error(`Group "${config.targetGroup}" was not found in @aslar55's dialog list. Make sure @aslar55 is a member of the group.`);
    }

    const entity = targetDialog.entity;
    console.log("✅ Group resolved successfully!");
    console.log(`- Group Title: ${targetDialog.title || config.targetGroup}`);
    console.log(`- Group ID: ${entity.id}`);

    console.log("\nFetching recent messages from group...");
    const messages = await client.getMessages(entity, { limit: 5 });
    console.log(`Received ${messages.length} recent messages:\n`);

    messages.forEach((msg, idx) => {
      console.log(`--- Message [${idx + 1}] (ID: ${msg.id}) ---`);
      console.log(msg.text);

      if (msg.text) {
        const parsed = parseSupplierResponse(msg.text);
        console.log(`Parsed Status: [${parsed.status}] | Supplier Order ID: [${parsed.supplierOrderId ?? "None"}] | UID: [${parsed.freeFireUid ?? "None"}]`);
      }
      console.log("------------------------------------------");
    });

    console.log("\n✅ Safe Telegram integration verification completed successfully.");

    await client.disconnect();
  } catch (err) {
    console.error("\n❌ Telegram connection test failed:");
    console.error(err instanceof Error ? err.message : err);
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

main().catch(console.error);
