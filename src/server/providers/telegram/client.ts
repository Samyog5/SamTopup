import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import type { TelegramProviderConfig } from "./types";

/**
 * Reads Telegram MTProto credentials from environment variables.
 * Returns config object or null if credentials are missing.
 */
export function getTelegramConfig(): TelegramProviderConfig | null {
  const apiIdStr = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION;
  const targetGroup = process.env.TELEGRAM_TARGET_GROUP ?? "SR2298 Nepal";

  if (!apiIdStr || !apiHash || !session) {
    return null;
  }

  const apiId = parseInt(apiIdStr, 10);
  if (isNaN(apiId) || apiId <= 0) {
    return null;
  }

  return {
    apiId,
    apiHash: apiHash.trim(),
    session: session.trim(),
    targetGroup: targetGroup.trim(),
  };
}

/**
 * Instantiates a GramJS TelegramClient using the persistent StringSession.
 */
export function createTelegramClient(config: TelegramProviderConfig): TelegramClient {
  const stringSession = new StringSession(config.session);

  return new TelegramClient(stringSession, config.apiId, config.apiHash, {
    connectionRetries: 3,
    autoReconnect: true,
  });
}
