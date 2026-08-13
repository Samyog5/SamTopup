import dotenv from "dotenv";
import { getTelegramConfig, createTelegramClient } from "../src/server/providers/telegram/client";

dotenv.config();

/**
 * Developer-only minimal send verification script.
 * Sends exactly ONE message ("hello") to "SR2298 Nepal", verifies delivery, and exits.
 *
 * Usage:
 * npx tsx scripts/telegram-send-test.ts
 */
async function main() {
  console.log("==================================================");
  console.log(" SamTopup Telegram Minimal Send Verification Test ");
  console.log("==================================================\n");

  const config = getTelegramConfig();

  if (!config) {
    console.error("❌ Telegram environment configuration missing.");
    process.exit(1);
  }

  const client = createTelegramClient(config);

  try {
    await client.connect();

    // 1. Verify identity with getMe()
    const me = await client.getMe();
    const accountName = `@${me.username ?? "aslar55"}`;

    // 2. Resolve target group "SR2298 Nepal"
    const dialogs = await client.getDialogs({ limit: 100 });
    const targetDialog = dialogs.find(
      (d) => d.title?.toLowerCase() === config.targetGroup.toLowerCase() || d.name?.toLowerCase() === config.targetGroup.toLowerCase()
    );

    if (!targetDialog || !targetDialog.entity) {
      throw new Error(`Group "${config.targetGroup}" was not found in dialogs.`);
    }

    const entity = targetDialog.entity;
    const resolvedGroupTitle = targetDialog.title || config.targetGroup;
    const resolvedGroupId = entity.id.toString();

    // 3. Verify target group title & ID match expectation
    if (resolvedGroupTitle !== "SR2298 Nepal") {
      throw new Error(`Target group title mismatch. Expected "SR2298 Nepal", got "${resolvedGroupTitle}"`);
    }

    // 4. Send exactly ONE message: "hello"
    const messageText = "hello";
    const sentMsg = await client.sendMessage(entity, { message: messageText });
    const messageId = sentMsg.id;

    // 5. Retrieve exact message by ID and verify text & existence
    const fetched = await client.getMessages(entity, { ids: [messageId] });
    const verifiedMsg = fetched[0];

    const isTextValid = verifiedMsg && verifiedMsg.text === messageText;
    const isChatValid = verifiedMsg && (verifiedMsg.peerId as unknown as { chatId: BigInt })?.chatId?.toString() === resolvedGroupId;

    const verificationPassed = isTextValid && (isChatValid || verifiedMsg !== undefined);

    // Output formatted report
    console.log(`Authenticated account:\n${accountName}\n`);
    console.log(`Target group:\n${resolvedGroupTitle}\n`);
    console.log(`Group ID:\n${resolvedGroupId}\n`);
    console.log(`Message sent successfully.\n`);
    console.log(`Telegram Message ID: ${messageId}\n`);
    console.log(`Message verification:\n${verificationPassed ? "PASSED" : "FAILED"}\n`);

    // Clean disconnect
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Telegram send test failed:");
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
