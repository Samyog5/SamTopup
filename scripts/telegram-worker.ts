import dotenv from "dotenv";
import { NewMessage } from "telegram/events";
import { getTelegramConfig, createTelegramClient } from "../src/server/providers/telegram/client";
import { parseSupplierResponse } from "../src/server/providers/telegram/parser";
import { correlateAndFulfillOrder } from "../src/server/providers/telegram/correlator";
import { processOutboundQueue } from "../src/server/providers/telegram/outbound-queue";

dotenv.config();

/**
 * Standalone Telegram Listener Worker.
 *
 * Runs as a background process outside Vercel.
 * Connects to Telegram using GramJS with TELEGRAM_SESSION, listens to incoming
 * reseller messages in group "SR2298 Nepal", parses supplier responses,
 * updates order states in PostgreSQL, and dispatches outbound orders.
 *
 * Usage:
 * npx tsx scripts/telegram-worker.ts
 */
async function main() {
  console.log("==================================================");
  console.log(" SamTopup Telegram Reseller Listener Worker       ");
  console.log("==================================================\n");

  const config = getTelegramConfig();

  if (!config) {
    console.error("❌ Cannot start worker: Missing TELEGRAM_API_ID, TELEGRAM_API_HASH, or TELEGRAM_SESSION in .env");
    process.exit(1);
  }

  const client = createTelegramClient(config);

  console.log("Connecting GramJS MTProto client...");
  await client.connect();

  const me = await client.getMe();
  console.log(`Connected as user account @${me.username ?? "aslar55"} (ID: ${me.id})`);

  console.log(`Resolving target group "${config.targetGroup}"...`);
  const dialogs = await client.getDialogs({ limit: 100 });
  const targetDialog = dialogs.find(
    (d) => d.title?.toLowerCase() === config.targetGroup.toLowerCase() || d.name?.toLowerCase() === config.targetGroup.toLowerCase()
  );

  if (!targetDialog || !targetDialog.entity) {
    console.error(`❌ Group "${config.targetGroup}" was not found in @aslar55's dialog list.`);
    process.exit(1);
  }

  const groupEntity = targetDialog.entity;
  console.log(`✅ Resolved group "${targetDialog.title || config.targetGroup}" (ID: ${groupEntity.id})`);

  // Use numeric entity ID derived from target group for GramJS NewMessage event filter
  const targetChatId = groupEntity.id;

  console.log("\nListening for incoming messages in group...");

  client.addEventHandler(
    async (event) => {
      const message = event.message;
      if (!message || !message.text) return;

      console.log(`\n[${new Date().toISOString()}] Received message ID #${message.id}:`);
      console.log(message.text);

      const parsed = parseSupplierResponse(message.text);
      console.log(`Parsed Status: ${parsed.status} | Order ID: ${parsed.supplierOrderId ?? "N/A"} | UID: ${parsed.freeFireUid ?? "N/A"}`);

      if (parsed.status !== "UNKNOWN") {
        try {
          const replyToId = message.replyTo?.replyToMsgId;
          const result = await correlateAndFulfillOrder(parsed, replyToId);

          if (result.matched) {
            console.log(`✅ Matched Order #${result.orderNumber} (ID: ${result.orderId})`);
            console.log(`   Status transition: ${result.previousStatus} -> ${result.newStatus}`);
            console.log(`   Reason: ${result.reason}`);
          } else {
            console.log(`⚠️ Unmatched message: ${result.reason}`);
          }
        } catch (err) {
          console.error("❌ Error correlating order:", err);
        }
      } else {
        console.log("ℹ️ Message does not contain supplier topup response signals. Skipped.");
      }
    },
    new NewMessage({ chats: [targetChatId] })
  );

  // Start Outbound Telegram Dispatch Polling Queue
  const autoFulfill = process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED === "true";
  console.log(`Outbound Fulfillment Queue initialized (TELEGRAM_AUTO_FULFILLMENT_ENABLED=${autoFulfill})`);

  let isPolling = false;
  const pollInterval = setInterval(async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      await processOutboundQueue({ client, targetGroup: groupEntity });
    } catch (err) {
      console.error("❌ Error in outbound queue poll iteration:", err);
    } finally {
      isPolling = false;
    }
  }, 3000);

  // Clean shutdown handlers
  const cleanup = async () => {
    console.log("\nStopping worker...");
    clearInterval(pollInterval);
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  console.log("Worker is active and listening. Press Ctrl+C to stop.");
}

main().catch(console.error);

