export type SupplierMessageStatus = "SUCCESS" | "FAILED" | "UNKNOWN";

export interface TelegramProviderConfig {
  apiId: number;
  apiHash: string;
  session: string;
  targetGroup: string;
}

export interface ParsedSupplierMessage {
  status: SupplierMessageStatus;
  supplierOrderId: string | null;
  freeFireUid: string | null;
  gamePlayerName: string | null;
  packageName: string | null;
  deliveryStatus: string | null;
  rawMessage: string;
}

export interface OutboundSupplierRequest {
  orderId?: string;
  orderNumber?: string;
  freeFireUid: string;
  supplierCommandTemplate: string;
  formattedCommand: string;
  targetGroup: string;
}
