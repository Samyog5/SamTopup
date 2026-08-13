import type { OrderStatusType, WalletTxType, UserRoleType } from "@/config/constants";
import type { GameCode, ProductType } from "@/generated/prisma/client";

// ─── Money Types ─────────────────────────────────────────────────────────────

/** Paisa value (integer) — the internal representation of money */
export type Paisa = number;

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Session Types ───────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  role: UserRoleType;
}

// ─── Wallet Types ────────────────────────────────────────────────────────────

export interface WalletBalance {
  balance: Paisa;
  formatted: string;
}

export interface WalletTransactionDisplay {
  id: string;
  type: WalletTxType;
  amount: Paisa;
  balanceBefore: Paisa;
  balanceAfter: Paisa;
  reference: string | null;
  description: string | null;
  idempotencyKey?: string | null;
  adminId?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  createdAt: Date;
}

export interface UserWalletSummary {
  id: string;
  name: string | null;
  email: string;
  role: UserRoleType;
  walletBalance: Paisa;
  walletFormatted: string;
  createdAt: Date;
}

// ─── Product Types ───────────────────────────────────────────────────────────

export interface ProductCustomerDisplay {
  id: string;
  name: string;
  description: string | null;
  game: GameCode;
  type: ProductType;
  amount: number | null;
  sellingPricePaisa: Paisa;
  priceFormatted: string;
  active: boolean;
  sortOrder: number;
}

export interface ProductAdminDisplay extends ProductCustomerDisplay {
  supplierCostPaisa: Paisa | null;
  costFormatted: string | null;
  supplierCommand: string;
  profitPaisa: Paisa | null;
  profitFormatted: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Order Types ─────────────────────────────────────────────────────────────

export interface OrderEventDisplay {
  id: string;
  orderId: string;
  fromStatus: OrderStatusType | null;
  toStatus: OrderStatusType;
  note: string | null;
  triggeredBy: string | null;
  createdAt: Date;
}

export interface CustomerOrderDisplay {
  id: string;
  orderNumber: string;
  game: GameCode;
  productNameSnapshot: string;
  productTypeSnapshot: ProductType;
  productAmountSnapshot: number | null;
  freeFireUid: string;
  gamePlayerName: string | null;
  sellingPricePaisa: Paisa;
  priceFormatted: string;
  status: OrderStatusType;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  events?: OrderEventDisplay[];
}

export interface AdminOrderDisplay extends CustomerOrderDisplay {
  userId: string;
  userEmail: string;
  userName: string | null;
  supplierCostPaisa: Paisa | null;
  costFormatted: string | null;
  profitPaisa: Paisa | null;
  profitFormatted: string | null;
  supplierCommandSnapshot: string | null;
  supplierOrderId: string | null;
  providerData: string | null;
  idempotencyKey: string | null;
}
