import { prisma } from "@/lib/db/prisma";
import { formatNPR, isValidPaisa } from "@/lib/money";
import type { WalletTransactionType } from "@/generated/prisma/client";
import type { UserWalletSummary, PaginatedResult, WalletTransactionDisplay } from "@/types";

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreditWalletInput {
  userId: string;
  amountPaisa: number;
  description?: string;
  reference?: string;
  idempotencyKey?: string;
  adminId?: string;
}

export interface DebitWalletInput {
  userId: string;
  amountPaisa: number;
  description?: string;
  reference?: string;
  idempotencyKey?: string;
  type?: WalletTransactionType; // DEBIT or REFUND
}

export interface CreditWalletResult {
  transaction: WalletTransactionDisplay;
  duplicate: boolean;
}

export interface RefundWalletOrderResult {
  refunded: boolean;
  duplicate: boolean;
  transaction: {
    id: string;
    type: WalletTransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reference: string | null;
    description: string | null;
    idempotencyKey: string | null;
    createdAt: Date;
  };
}

// ─── Wallet Core Service Functions ───────────────────────────────────────────

/**
 * Get a user's wallet balance (in paisa and formatted string).
 * Auto-creates a 0-balance wallet if one does not exist yet.
 */
export async function getWalletBalance(userId: string): Promise<{
  balance: number;
  formatted: string;
}> {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { balance: true },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId, balance: 0 },
      select: { balance: true },
    });
  }

  return {
    balance: wallet.balance,
    formatted: formatNPR(wallet.balance),
  };
}

/**
 * Atomic credit wallet operation.
 * Locks wallet row (FOR UPDATE) inside transaction, checks idempotency key,
 * updates balance, and logs immutable ledger transaction.
 */
export async function creditWallet(
  input: CreditWalletInput
): Promise<CreditWalletResult> {
  const {
    userId,
    amountPaisa,
    description,
    reference,
    idempotencyKey,
    adminId,
  } = input;

  if (!isValidPaisa(amountPaisa) || amountPaisa <= 0) {
    throw new Error("Invalid credit amount. Must be a positive integer in paisa.");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingTx = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
        include: {
          admin: { select: { name: true, email: true } },
          wallet: { select: { user: { select: { name: true, email: true } } } },
        },
      });

      if (existingTx) {
        return {
          transaction: {
            id: existingTx.id,
            type: existingTx.type,
            amount: existingTx.amount,
            balanceBefore: existingTx.balanceBefore,
            balanceAfter: existingTx.balanceAfter,
            reference: existingTx.reference,
            description: existingTx.description,
            idempotencyKey: existingTx.idempotencyKey,
            adminId: existingTx.adminId,
            adminName: existingTx.admin?.name ?? null,
            adminEmail: existingTx.admin?.email ?? null,
            userName: existingTx.wallet.user.name,
            userEmail: existingTx.wallet.user.email,
            createdAt: existingTx.createdAt,
          },
          duplicate: true,
        };
      }
    }

    // 2. Ensure wallet exists
    let wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // 3. Acquire row lock on Wallet for atomic update
    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${wallet.id} FOR UPDATE`;

    // 4. Re-fetch current balance after acquiring lock
    const freshWallet = await tx.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    const balanceBefore = freshWallet.balance;
    const balanceAfter = balanceBefore + amountPaisa;

    // 5. Update wallet balance
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    // 6. Create immutable ledger transaction
    const createdTx = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        amount: amountPaisa,
        balanceBefore,
        balanceAfter,
        reference,
        description,
        idempotencyKey,
        adminId,
      },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        wallet: { select: { user: { select: { name: true, email: true } } } },
      },
    });

    return {
      transaction: {
        id: createdTx.id,
        type: createdTx.type,
        amount: createdTx.amount,
        balanceBefore: createdTx.balanceBefore,
        balanceAfter: createdTx.balanceAfter,
        reference: createdTx.reference,
        description: createdTx.description,
        idempotencyKey: createdTx.idempotencyKey,
        adminId: createdTx.adminId,
        adminName: createdTx.admin?.name ?? null,
        adminEmail: createdTx.admin?.email ?? null,
        userName: createdTx.wallet.user.name,
        userEmail: createdTx.wallet.user.email,
        createdAt: createdTx.createdAt,
      },
      duplicate: false,
    };
  });
}

/**
 * Atomic debit wallet operation.
 * Locks wallet row (FOR UPDATE) inside transaction, checks idempotency, overspend protection,
 * updates balance, and logs immutable ledger transaction.
 */
export async function debitWallet(
  input: DebitWalletInput
): Promise<CreditWalletResult> {
  const {
    userId,
    amountPaisa,
    description,
    reference,
    idempotencyKey,
    type = "DEBIT",
  } = input;

  if (!isValidPaisa(amountPaisa) || amountPaisa <= 0) {
    throw new Error("Invalid debit amount. Must be a positive integer in paisa.");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingTx = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
        include: {
          wallet: { select: { user: { select: { name: true, email: true } } } },
        },
      });

      if (existingTx) {
        return {
          transaction: {
            id: existingTx.id,
            type: existingTx.type,
            amount: existingTx.amount,
            balanceBefore: existingTx.balanceBefore,
            balanceAfter: existingTx.balanceAfter,
            reference: existingTx.reference,
            description: existingTx.description,
            idempotencyKey: existingTx.idempotencyKey,
            userName: existingTx.wallet.user.name,
            userEmail: existingTx.wallet.user.email,
            createdAt: existingTx.createdAt,
          },
          duplicate: true,
        };
      }
    }

    // 2. Ensure wallet exists
    let wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // 3. Acquire row lock on Wallet for atomic update
    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${wallet.id} FOR UPDATE`;

    // 4. Re-fetch current balance after acquiring lock
    const freshWallet = await tx.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    // 5. Overspend check: balance must be >= amountPaisa
    if (freshWallet.balance < amountPaisa) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    const balanceBefore = freshWallet.balance;
    const balanceAfter = balanceBefore - amountPaisa;

    // 6. Update wallet balance
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    // 7. Create immutable ledger transaction
    const createdTx = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount: amountPaisa,
        balanceBefore,
        balanceAfter,
        reference,
        description,
        idempotencyKey,
      },
      include: {
        wallet: { select: { user: { select: { name: true, email: true } } } },
      },
    });

    return {
      transaction: {
        id: createdTx.id,
        type: createdTx.type,
        amount: createdTx.amount,
        balanceBefore: createdTx.balanceBefore,
        balanceAfter: createdTx.balanceAfter,
        reference: createdTx.reference,
        description: createdTx.description,
        idempotencyKey: createdTx.idempotencyKey,
        userName: createdTx.wallet.user.name,
        userEmail: createdTx.wallet.user.email,
        createdAt: createdTx.createdAt,
      },
      duplicate: false,
    };
  });
}

/**
 * Dedicated atomic wallet refund service operation for a failed order.
 *
 * Concurrency & Idempotency Rules:
 * 1. Starts a Prisma transaction.
 * 2. Locks user wallet row (FOR UPDATE).
 * 3. Deterministic idempotency key: `refund:${order.orderNumber}` (e.g. `refund:ST-20260813-13063`).
 * 4. Checks if refund transaction already exists -> returns existing without crediting again.
 * 5. Credits exact original paid amount from order snapshot.
 * 6. Creates CREDIT WalletTransaction ledger entry.
 * 7. Updates order status to REFUNDED.
 * 8. Logs audit OrderEvents for FAILED and REFUNDED.
 */
export async function refundWalletForOrder(
  orderId: string,
  reason = "Automatic refund for failed Free Fire top-up"
): Promise<RefundWalletOrderResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch order
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found for refund`);
    }

    const idempotencyKey = `refund:${order.orderNumber}`;

    // 2. Idempotency Check: check if refund transaction already exists
    const existingTx = await tx.walletTransaction.findUnique({
      where: { idempotencyKey },
    });

    if (existingTx) {
      // Ensure order status is updated to REFUNDED if not already
      if (order.status !== "REFUNDED") {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "REFUNDED" },
        });
      }

      return {
        refunded: false,
        duplicate: true,
        transaction: {
          id: existingTx.id,
          type: existingTx.type,
          amount: existingTx.amount,
          balanceBefore: existingTx.balanceBefore,
          balanceAfter: existingTx.balanceAfter,
          reference: existingTx.reference,
          description: existingTx.description,
          idempotencyKey: existingTx.idempotencyKey,
          createdAt: existingTx.createdAt,
        },
      };
    }

    // 3. Lock user wallet row for atomic update
    let wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { userId: order.userId, balance: 0 },
      });
    }

    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${wallet.id} FOR UPDATE`;

    const freshWallet = await tx.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    const balanceBefore = freshWallet.balance;
    const refundAmountPaisa = order.sellingPricePaisa;
    const balanceAfter = balanceBefore + refundAmountPaisa;

    // 4. Update wallet balance
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    // 5. Create immutable CREDIT transaction
    const createdTx = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        amount: refundAmountPaisa,
        balanceBefore,
        balanceAfter,
        reference: order.orderNumber,
        description: `${reason} (${order.orderNumber})`,
        idempotencyKey,
      },
    });

    // 6. Update order status to REFUNDED
    await tx.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
    });

    // 7. Log immutable OrderEvents
    const existingFailedEvent = await tx.orderEvent.findFirst({
      where: { orderId: order.id, toStatus: "FAILED" },
    });

    if (!existingFailedEvent && order.status === "PROCESSING") {
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: "PROCESSING",
          toStatus: "FAILED",
          note: "Supplier reported top-up failure",
          triggeredBy: "TELEGRAM_PROVIDER",
        },
      });
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        fromStatus: "FAILED",
        toStatus: "REFUNDED",
        note: `Automatically refunded ${formatNPR(refundAmountPaisa)} to customer wallet for failed top-up`,
        triggeredBy: "SYSTEM_REFUND",
      },
    });

    return {
      refunded: true,
      duplicate: false,
      transaction: {
        id: createdTx.id,
        type: createdTx.type,
        amount: createdTx.amount,
        balanceBefore: createdTx.balanceBefore,
        balanceAfter: createdTx.balanceAfter,
        reference: createdTx.reference,
        description: createdTx.description,
        idempotencyKey: createdTx.idempotencyKey,
        createdAt: createdTx.createdAt,
      },
    };
  });
}

/**
 * Fetch paginated wallet transactions for a specific user.
 */
export async function getWalletTransactions(
  userId: string,
  page = 1,
  limit = 10
): Promise<PaginatedResult<WalletTransactionDisplay>> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!wallet) {
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 1,
    };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        admin: { select: { name: true, email: true } },
      },
    }),
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
  ]);

  const mappedItems: WalletTransactionDisplay[] = items.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    amountFormatted: formatNPR(tx.amount),
    balanceBefore: tx.balanceBefore,
    balanceAfter: tx.balanceAfter,
    balanceAfterFormatted: formatNPR(tx.balanceAfter),
    reference: tx.reference,
    description: tx.description,
    idempotencyKey: tx.idempotencyKey,
    adminId: tx.adminId,
    adminName: tx.admin?.name ?? null,
    adminEmail: tx.admin?.email ?? null,
    createdAt: tx.createdAt,
  }));

  return {
    items: mappedItems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Fetch users with their current wallet balance for the admin management view.
 */
export async function getUsersWithWallets(options: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResult<UserWalletSummary>> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const search = options.search?.trim();

  const where = search
    ? {
        OR: [
          { id: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        wallet: { select: { balance: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const items: UserWalletSummary[] = users.map((u) => {
    const balance = u.wallet?.balance ?? 0;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      walletBalance: balance,
      walletFormatted: formatNPR(balance),
      createdAt: u.createdAt,
    };
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
