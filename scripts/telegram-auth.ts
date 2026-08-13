import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import readline from "readline";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

/**
 * Ensures phone number includes international country code format (e.g. +9779863634740).
 */
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s-]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("98") || cleaned.startsWith("97")) {
      cleaned = `+977${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }
  return cleaned;
}

/**
 * Automatically updates TELEGRAM_SESSION in local .env file.
 */
function updateEnvFile(sessionString: string, apiId: number, apiHash: string) {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  let envContent = fs.readFileSync(envPath, "utf-8");

  // Update TELEGRAM_SESSION
  if (envContent.includes("TELEGRAM_SESSION=")) {
    envContent = envContent.replace(
      /TELEGRAM_SESSION=.*/g,
      `TELEGRAM_SESSION="${sessionString}"`
    );
  } else {
    envContent += `\nTELEGRAM_SESSION="${sessionString}"\n`;
  }

  // Update TELEGRAM_API_ID if blank
  if (envContent.includes('TELEGRAM_API_ID=""') || !envContent.includes("TELEGRAM_API_ID=")) {
    envContent = envContent.replace(
      /TELEGRAM_API_ID=.*/g,
      `TELEGRAM_API_ID="${apiId}"`
    );
  }

  // Update TELEGRAM_API_HASH if blank
  if (envContent.includes('TELEGRAM_API_HASH=""') || !envContent.includes("TELEGRAM_API_HASH=")) {
    envContent = envContent.replace(
      /TELEGRAM_API_HASH=.*/g,
      `TELEGRAM_API_HASH="${apiHash}"`
    );
  }

  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log("✅ Successfully updated TELEGRAM_SESSION in .env!");
}

/**
 * Interactive developer CLI authorization script for Telegram user account (@aslar55).
 * Generates the persistent StringSession string for TELEGRAM_SESSION in .env.
 *
 * Usage:
 * npx tsx scripts/telegram-auth.ts
 */
async function main() {
  console.log("==================================================");
  console.log(" SamTopup Telegram User Account Auth (@aslar55)   ");
  console.log("==================================================\n");

  const apiIdStr = process.env.TELEGRAM_API_ID || (await askQuestion("Enter TELEGRAM_API_ID: "));
  const apiHash = process.env.TELEGRAM_API_HASH || (await askQuestion("Enter TELEGRAM_API_HASH: "));

  const apiId = parseInt(apiIdStr, 10);
  if (isNaN(apiId) || apiId <= 0) {
    console.error("Invalid API ID.");
    process.exit(1);
  }

  const stringSession = new StringSession("");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.start({
      phoneNumber: async () => {
        const rawPhone = await askQuestion("Enter phone number for @aslar55 (e.g. +9779863634740): ");
        const normalized = normalizePhoneNumber(rawPhone);
        console.log(`Using phone number format: ${normalized}`);
        return normalized;
      },
      password: async () => await askQuestion("Enter 2FA Password (if enabled, or press Enter): "),
      phoneCode: async () => await askQuestion("Enter Telegram OTP Code sent to your account: "),
      onError: (err) => console.error("Auth error:", err),
    });

    // 1. Verify identity with getMe()
    const me = await client.getMe();
    console.log("\n==================================================");
    console.log("✅ AUTHENTICATION SUCCESSFUL!");
    console.log(`User Account: @${me.username ?? "aslar55"} (${me.firstName}${me.lastName ? " " + me.lastName : ""})`);
    console.log(`User ID: ${me.id}`);
    console.log("==================================================\n");

    // 2. Save session to .env
    const sessionString = client.session.save() as unknown as string;
    updateEnvFile(sessionString, apiId, apiHash);

    // 3. Cleanly disconnect client
    try {
      await client.disconnect();
      await client.destroy();
    } catch {
      // Ignore background update loop closing warnings
    }

    console.log("✅ Telegram auth script completed cleanly.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Authentication failed:", error);
    try {
      await client.disconnect();
    } catch {
      // Ignore
    }
    process.exit(1);
  }
}

// Suppress GramJS background update loop disconnect timeouts on process exit
process.on("uncaughtException", (err) => {
  if (err && err.message && (err.message.includes("TIMEOUT") || err.message.includes("closed"))) {
    process.exit(0);
  } else {
    console.error("Uncaught Error:", err);
    process.exit(1);
  }
});

main();
