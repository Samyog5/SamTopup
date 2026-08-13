// ─── Application Constants ───────────────────────────────────────────────────

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "SamTopup";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Currency ────────────────────────────────────────────────────────────────

export const CURRENCY = {
  code: "NPR",
  symbol: "Rs.",
  name: "Nepalese Rupees",
  subunit: "paisa",
  subunitFactor: 100, // 1 NPR = 100 paisa
} as const;

// ─── Games & Products ────────────────────────────────────────────────────────

export const GAMES = {
  FREE_FIRE_BD: {
    code: "FREE_FIRE_BD",
    name: "Free Fire Bangladesh",
    shortName: "Free Fire BD",
    description: "Instant Free Fire Diamond & Membership Top-Up in Bangladesh",
  },
} as const;

export const PRODUCT_TYPES = {
  DIAMONDS: "DIAMONDS",
  MEMBERSHIP: "MEMBERSHIP",
} as const;

// ─── Order Statuses (mirrors Prisma enum, for client-side use) ───────────────

export const ORDER_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
} as const;

export type OrderStatusType = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatusType, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  MANUAL_REVIEW: "Manual Review",
};

export const ORDER_STATUS_COLORS: Record<OrderStatusType, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  PROCESSING: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  FAILED: "bg-red-500/15 text-red-700 dark:text-red-400",
  REFUNDED: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  MANUAL_REVIEW: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
};

// ─── Wallet Transaction Types ────────────────────────────────────────────────

export const WALLET_TX_TYPE = {
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
  REFUND: "REFUND",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export type WalletTxType = (typeof WALLET_TX_TYPE)[keyof typeof WALLET_TX_TYPE];

// ─── User Roles ──────────────────────────────────────────────────────────────

export const USER_ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type UserRoleType = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  href: string;
  requiresAuth?: boolean;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Top Up", href: "/dashboard/topup/free-fire", requiresAuth: false },
  { label: "My Wallet", href: "/dashboard/wallet", requiresAuth: true },
];

export const ADMIN_NAV_LINKS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Telegram", href: "/admin/telegram" },
] as const;
