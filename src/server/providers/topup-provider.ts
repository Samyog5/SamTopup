/**
 * Topup Provider Interface
 *
 * Abstracts the fulfillment mechanism so the order system isn't coupled
 * to any specific provider (Telegram, UniPin, etc.).
 *
 * DO NOT implement concrete providers in this file.
 * Each provider gets its own file (e.g., telegram-provider.ts).
 *
 * Status: INTERFACE ONLY — No provider is implemented yet.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopupRequest {
  orderId: string;
  gameUid: string;
  productSku: string;
  productName: string;
  quantity: number;
}

export interface TopupResult {
  success: boolean;
  providerReference?: string;
  message?: string;
  rawResponse?: string;
}

export type TopupStatusValue = "PENDING" | "SUCCESS" | "FAILED" | "UNKNOWN";

export interface TopupStatus {
  status: TopupStatusValue;
  providerReference?: string;
  message?: string;
  updatedAt?: Date;
}

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface TopupProvider {
  /** Human-readable provider name */
  readonly name: string;

  /** Provider type identifier */
  readonly type: "TELEGRAM" | "UNIPIN" | "MANUAL";

  /**
   * Send a top-up request to the supplier.
   * Returns the result of the operation.
   *
   * @throws {Error} if the provider encounters an unrecoverable error
   */
  sendTopup(request: TopupRequest): Promise<TopupResult>;

  /**
   * Check the status of a previously submitted top-up.
   *
   * @param reference - The provider reference returned from sendTopup
   */
  checkStatus(reference: string): Promise<TopupStatus>;
}

// ─── Provider Registry (future use) ──────────────────────────────────────────

/**
 * Placeholder for provider registration.
 * In a later phase, this will manage multiple provider implementations
 * and route orders to the appropriate provider.
 */
export type ProviderRegistry = Map<string, TopupProvider>;
