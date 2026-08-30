/**
 * DISABLED: Manual Telegram message send script.
 *
 * Direct message sending via scripts is permanently disabled.
 * All outbound Telegram supplier commands must go through the
 * database-backed outbound fulfillment queue (outbound-queue.ts).
 */
async function disabledSendMain() {
  console.log("==================================================");
  console.log(" SamTopup Telegram Send Script (DISABLED)         ");
  console.log("==================================================\n");

  console.error("❌ Manual Telegram send test script is permanently disabled.");
  console.error("Outbound fulfillment is strictly handled via processOutboundQueue() in outbound-queue.ts.");
  process.exit(1);
}

disabledSendMain().catch(console.error);
