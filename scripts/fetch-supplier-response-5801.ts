import "dotenv/config";
import dotenv from "dotenv";
import { getTelegramConfig, createTelegramClient } from "../src/server/providers/telegram/client";
import { parseSupplierResponse } from "../src/server/providers/telegram/parser";
import { correlateAndFulfillOrder } from "../src/server/providers/telegram/correlator";
import { prisma } from "../src/lib/db/prisma";

dotenv.config();

const ORDER_NUMBER = "ST-20260813-93985";
const SENT_MSG_ID = 5801;

async function main() {
  console.log("==================================================");
  console.log(" Fetching Supplier Response for Message #" + SENT_MSG_ID);
  console.log(" Order Number: " + ORDER_NUMBER);
  console.log("==================================================\n");

  const config = getTelegramConfig();
  if (!config) {
    console.error("❌ Telegram configuration missing.");
    process.exit(1);
  }

  const client = createTelegramClient(config);
  await client.connect();

  const dialogs = await client.getDialogs({ limit: 100 });
  const targetDialog = dialogs.find(
    (d) => d.title?.toLowerCase() === config.targetGroup.toLowerCase() || d.name?.toLowerCase() === config.targetGroup.toLowerCase()
  );

  if (!targetDialog || !targetDialog.entity) {
    console.error("❌ Group entity not found.");
    await client.disconnect();
    process.exit(1);
  }

  console.log("Fetching latest messages from group " + config.targetGroup + "...");
  const messages = await client.getMessages(targetDialog.entity, { limit: 25 });

  console.log(`Fetched ${messages.length} messages. Searching for reply to #${SENT_MSG_ID} or UID 2131711307...\n`);

  let matchedMsg = messages.find((m) => m.replyTo && m.replyTo.replyToMsgId === SENT_MSG_ID);
  if (!matchedMsg) {
    matchedMsg = messages.find((m) => m.text && m.text.includes("2131711307") && m.id > SENT_MSG_ID);
  }

  if (matchedMsg && matchedMsg.text) {
    console.log(`✅ FOUND SUPPLIER RESPONSE MESSAGE ID #${matchedMsg.id}:`);
    console.log("--------------------------------------------------");
    console.log(matchedMsg.text);
    console.log("--------------------------------------------------\n");

    const replyToId = matchedMsg.replyTo?.replyToMsgId ?? SENT_MSG_ID;
    const parsed = parseSupplierResponse(matchedMsg.text);

    console.log("Executing Correlation Engine...");
    const correlation = await correlateAndFulfillOrder(parsed, replyToId);
    console.log("Correlation Result:", correlation);
  } else {
    console.log("Recent messages in group:");
    messages.forEach((m) => {
      console.log(`[Msg #${m.id} | ReplyTo: ${m.replyTo?.replyToMsgId ?? "None"}]: ${m.text?.slice(0, 80)}...`);
    });
  }

  await client.disconnect();
}

main().catch((err) => {
  console.error("❌ Fetch script crashed:", err);
  process.exit(1);
});
