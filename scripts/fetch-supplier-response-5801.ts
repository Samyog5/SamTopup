/**
 * DISABLED: Debug script for fetching supplier response for message #5801.
 *
 * This script previously connected to the real Telegram account and modified
 * database order state via correlateAndFulfillOrder(). It has been permanently
 * disabled to prevent accidental Telegram connections and database mutations
 * during development.
 *
 * The outbound fulfillment queue (outbound-queue.ts) is the ONLY legitimate
 * path for Telegram supplier interactions.
 */
async function disabledFetchMain() {
  console.log("==================================================");
  console.log(" Fetch Supplier Response Script (DISABLED)         ");
  console.log("==================================================\n");

  console.error("❌ This debug script is permanently disabled.");
  console.error("It previously connected to the real Telegram account and modified database state.");
  console.error("Supplier response correlation is handled automatically by the telegram-worker.ts listener.");
  process.exit(1);
}

disabledFetchMain().catch(console.error);
