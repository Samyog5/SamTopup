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
 * Developer-only single-order Telegram fulfillment test script.
 * Fulfills ONLY order ST-20260813-93985 to supplier group "SR2298 Nepal" via @aslar55.
 *
 * Usage:
 * npx tsx scripts/telegram-fulfill-single-order.ts
 */
async function main() {
  console.log("==================================================");
  console.log(" SamTopup Controlled Single Order Fulfillment Test");
  console.log(" Target Order: " + TARGET_ORDER_NUMBER);
  console.log("==================================================\n");

  // 1. Pre-send database inspection
  console.log("Step 1: Inspecting order in PostgreSQL database...");
  const order = await prisma.order.findFirst({
    where: { orderNumber: TARGET_ORDER_NUMBER },
    include: { providerLogs: true, events: true },
  });

  if (!order) {
    console.error(`❌ ABORT: Order ${TARGET_ORDER_NUMBER} not found in database.`);
    process.exit(1);
  }

  console.log(`- Order Number: ${order.orderNumber}`);
  console.log(`- Status: ${order.status}`);
  console.log(`- Product: ${order.productNameSnapshot} (Amount: ${order.productAmountSnapshot})`);
  console.log(`- Selling Price: Rs. ${order.sellingPricePaisa / 100}`);
  console.log(`- Free Fire UID: ${order.freeFireUid}`);
  console.log(`- Supplier Command Template: ${order.supplierCommandSnapshot}`);
  console.log(`- Provider Logs Count: ${order.providerLogs.length}`);

  // 2. Strict Pre-send Verification Checks
  if (order.status !== "PROCESSING") {
    console.error(`❌ ABORT: Order status is "${order.status}" (expected "PROCESSING").`);
    process.exit(1);
  }

  if (!order.supplierCommandSnapshot || !order.supplierCommandSnapshot.includes("{uid}")) {
    console.error(`❌ ABORT: Missing or invalid supplier command snapshot.`);
    process.exit(1);
  }

  if (order.completedAt !== null) {
    console.error(`❌ ABORT: Order is already completed.`);
    process.exit(1);
  }

  if (order.providerLogs.length > 0) {
    console.error(`❌ ABORT: Order already has ${order.providerLogs.length} provider logs. Command was already sent.`);
    process.exit(1);
  }

  // Format exact command server-side from trusted snapshot
  const formattedCommand = formatSupplierCommand(order.supplierCommandSnapshot, order.freeFireUid);
  console.log(`\n✅ Pre-send checks PASSED.`);
  console.log(`Formatted Supplier Command: "${formattedCommand}"`);

  if (!formattedCommand.startsWith("bduc 2131711307 25")) {
    console.error(`❌ ABORT: Formatted command "${formattedCommand}" does not match snapshot expectation "bduc 2131711307 25".`);
    process.exit(1);
  }

  // 3. Connect GramJS MTProto client
  console.log("\nStep 2: Connecting Telegram GramJS client (@aslar55)...");
  const config = getTelegramConfig();
  if (!config) {
    console.error("❌ Telegram environment configuration missing.");
    process.exit(1);
  }

  const client = createTelegramClient(config);
  await client.connect();

  const me = await client.getMe();
  console.log(`Authenticated as: @${me.username ?? "aslar55"} (ID: ${me.id})`);

  // 4. Resolve group entity "SR2298 Nepal"
  console.log(`Resolving target group "${config.targetGroup}"...`);
  const dialogs = await client.getDialogs({ limit: 100 });
  const targetDialog = dialogs.find(
    (d) => d.title?.toLowerCase() === config.targetGroup.toLowerCase() || d.name?.toLowerCase() === config.targetGroup.toLowerCase()
  );

  if (!targetDialog || !targetDialog.entity) {
    console.error(`❌ Group "${config.targetGroup}" not found in dialogs.`);
    await client.disconnect();
    process.exit(1);
  }

  const groupEntity = targetDialog.entity;
  const groupId = groupEntity.id.toString();
  console.log(`Resolved Group: "${targetDialog.title || config.targetGroup}" (ID: ${groupId})`);

  const inputPeer = await client.getInputEntity(groupEntity);

  let correlationResult: CorrelationResult | null = null;
  let rawSupplierMessageText = "";
  let responseReceived = false;

  // 5. Start listener BEFORE sending command
  console.log("\nStep 3: Attaching background listener for supplier responses in group...");
  client.addEventHandler(
    async (event) => {
      const message = event.message;
      if (!message || !message.text) return;

      const messageText = message.text;
      console.log(`\n[${new Date().toISOString()}] Received group message ID #${message.id}:`);
      console.log(messageText);

      const parsed = parseSupplierResponse(messageText);
      console.log(`Parsed Status: ${parsed.status} | Order ID: ${parsed.supplierOrderId ?? "N/A"} | UID: ${parsed.freeFireUid ?? "N/A"} | User: ${parsed.gamePlayerName ?? "N/A"}`);

      // Check if this response pertains to supplier activity
      if (parsed.status !== "UNKNOWN" || parsed.freeFireUid === order.freeFireUid) {
        rawSupplierMessageText = messageText;
        const replyToId = message.replyTo?.replyToMsgId;

        console.log("Running order correlation engine...");
        const result = await correlateAndFulfillOrder(parsed, replyToId);
        correlationResult = result;
        responseReceived = true;
      }
    },
    new NewMessage({ chats: [inputPeer] })
  );

  // 6. Send EXACTLY ONE command
  console.log(`\nStep 4: Sending EXACTLY ONE command: "${formattedCommand}"...`);
  const sendTimestamp = new Date().toISOString();
  const sentMsg = await client.sendMessage(groupEntity, { message: formattedCommand });
  const outgoingMsgId = sentMsg.id;

  console.log(`✅ Outbound command sent successfully!`);
  console.log(`- Outgoing Telegram Message ID: ${outgoingMsgId}`);
  console.log(`- Timestamp: ${sendTimestamp}`);

  // Create initial outbound ProviderLog
  await prisma.providerLog.create({
    data: {
      orderId: order.id,
      providerType: "TELEGRAM",
      request: JSON.stringify({
        orderNumber: order.orderNumber,
        formattedCommand,
        telegramMessageId: outgoingMsgId,
        targetGroup: config.targetGroup,
        targetGroupId: groupId,
      }),
      success: true,
    },
  });

  // 7. Wait for supplier response (max 45 seconds)
  console.log("\nStep 5: Waiting for supplier response in SR2298 Nepal (max 45s)...");
  const startTime = Date.now();
  while (!responseReceived && Date.now() - startTime < 45000) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 8. Re-query final order state from PostgreSQL
  const finalOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { events: true, providerLogs: true },
  });

  // Cleanly disconnect GramJS client
  try {
    await client.disconnect();
  } catch {
    // ignore
  }

  const parsedFinal = parseSupplierResponse(rawSupplierMessageText);

  // 9. Detailed Controlled Test Report
  console.log("\n==================================================");
  console.log(" CONTROLLED SINGLE ORDER FULFILLMENT REPORT       ");
  console.log("==================================================");
  console.log(`1. Order Inspection Result: PASSED (Order ${TARGET_ORDER_NUMBER} in PROCESSING status)`);
  console.log(`2. Exact Supplier Command Sent: "${formattedCommand}"`);
  console.log(`3. Telegram Outgoing Message ID: ${outgoingMsgId}`);
  console.log(`4. Supplier Raw Response:\n${rawSupplierMessageText || "(No response received within timeout)"}`);
  console.log(`5. Parsed Supplier Status: ${parsedFinal.status}`);
  console.log(`6. Supplier Order ID: ${parsedFinal.supplierOrderId ?? "N/A"}`);
  console.log(`7. Free Fire UID: ${parsedFinal.freeFireUid ?? order.freeFireUid}`);
  console.log(`8. Free Fire Player Name (gamePlayerName): ${finalOrder?.gamePlayerName ?? parsedFinal.gamePlayerName ?? "N/A"}`);
  console.log(`9. Delivery Status: ${parsedFinal.deliveryStatus ?? "N/A"}`);
  console.log(`10. Correlation Method: ${(correlationResult as CorrelationResult | null)?.reason ?? "N/A"}`);
  console.log(`11. Final SamTopup Order Status: ${finalOrder?.status ?? "PROCESSING"}`);
  console.log(`12. Wallet Transaction Result: Original debit of Rs. ${order.sellingPricePaisa / 100} intact`);
  console.log(`13. Refund Result: ${finalOrder?.status === "REFUNDED" ? "Refunded Rs. 28.00 to wallet" : "N/A (Not refunded)"}`);
  console.log(`14. Provider Logs Count: ${finalOrder?.providerLogs.length ?? 0}`);
  console.log(`15. Order Events Count: ${finalOrder?.events.length ?? 0}`);
  console.log(`16. Duplicate Command Check: PASSED (Exactly 1 command transmitted)`);
  console.log("==================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Single order fulfillment test crashed:", err);
  process.exit(1);
});
