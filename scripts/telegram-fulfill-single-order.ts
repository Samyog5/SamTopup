/**
 * DISABLED: Manual Telegram single order fulfillment script.
 *
 * Manual single order Telegram fulfillment via scripts is permanently disabled.
 * Production Telegram supplier commands must ONLY be sent by the database-backed
 * outbound fulfillment queue (outbound-queue.ts) for legitimate PROCESSING
 * customer orders.
 */
async function disabledFulfillMain() {
  console.log("==================================================");
  console.log(" SamTopup Single Order Fulfillment Script (DISABLED)");
  console.log("==================================================\n");

  console.error("❌ Manual Telegram single order fulfillment script is permanently disabled.");
  console.error("Outbound fulfillment is strictly handled via processOutboundQueue() in outbound-queue.ts.");
  process.exit(1);
}

disabledFulfillMain().catch(console.error);
