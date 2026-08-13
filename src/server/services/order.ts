import { prisma } from "@/lib/db/prisma";
import { formatNPR } from "@/lib/money";
import type { OrderStatus, GameCode, ProductType } from "@/generated/prisma/client";
import type {
  AdminOrderDisplay,
  CustomerOrderDisplay,
  OrderEventDisplay,
  PaginatedResult,
} from "@/types";

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  userId: string;
  productId: string;
  freeFireUid: string;
  idempotencyKey?: string;
}

export interface CreateOrderResult {
  order: CustomerOrderDisplay;
  duplicate: boolean;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Generate a human-friendly unique order number (e.g. ST-20260813-98412).
 */
export async function generateOrderNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let unique = false;
  let orderNumber = "";

  while (!unique) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 digits
    orderNumber = `ST-${dateStr}-${randomDigits}`;

    const existing = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!existing) {
      unique = true;
    }
  }

  return orderNumber;
}

// ─── Customer Order Service Functions ────────────────────────────────────────

/**
 * Atomic wallet payment & order creation.
 * Locks the user's wallet row (FOR UPDATE) inside a transaction, checks product active state & price,
 * verifies sufficient wallet balance, snapshot-records product data, debits wallet, logs ledger & events.
 */
export async function createAndPayOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const { userId, productId, freeFireUid, idempotencyKey } = input;

  const trimmedUid = freeFireUid.trim();
  if (!trimmedUid) {
    throw new Error("Free Fire Player UID is required");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Idempotency check
    if (idempotencyKey) {
      const existingOrder = await tx.order.findUnique({
        where: { idempotencyKey },
      });

      if (existingOrder) {
        return {
          order: {
            id: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            game: existingOrder.game,
            productNameSnapshot: existingOrder.productNameSnapshot,
            productTypeSnapshot: existingOrder.productTypeSnapshot,
            productAmountSnapshot: existingOrder.productAmountSnapshot,
            freeFireUid: existingOrder.freeFireUid,
            gamePlayerName: existingOrder.gamePlayerName,
            sellingPricePaisa: existingOrder.sellingPricePaisa,
            priceFormatted: formatNPR(existingOrder.sellingPricePaisa),
            status: existingOrder.status,
            createdAt: existingOrder.createdAt,
            updatedAt: existingOrder.updatedAt,
            completedAt: existingOrder.completedAt,
          },
          duplicate: true,
        };
      }
    }

    // 2. Lookup or create user wallet
    let wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // 3. Lock user wallet row for atomic update
    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${wallet.id} FOR UPDATE`;

    // 4. Re-fetch fresh wallet balance after acquiring row lock
    const freshWallet = await tx.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    // 5. Fetch product from database & verify active status
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      throw new Error("This product is currently unavailable. Please select another package.");
    }

    const sellingPricePaisa = product.sellingPricePaisa;

    // 6. Overspend check: verify wallet has sufficient balance
    if (freshWallet.balance < sellingPricePaisa) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    const balanceBefore = freshWallet.balance;
    const balanceAfter = balanceBefore - sellingPricePaisa;

    // 7. Generate unique order number
    const orderNumber = await generateOrderNumber();

    // 8. Create Order entry with snapshots in PROCESSING status
    const createdOrder = await tx.order.create({
      data: {
        orderNumber,
        userId,
        productId: product.id,
        game: product.game,
        productNameSnapshot: product.name,
        productTypeSnapshot: product.type,
        productAmountSnapshot: product.amount,
        sellingPricePaisa,
        supplierCostPaisa: product.supplierCostPaisa,
        supplierCommandSnapshot: product.supplierCommand,
        freeFireUid: trimmedUid,
        status: "PROCESSING",
        idempotencyKey,
      },
    });

    // 9. Debit user wallet balance
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    // 10. Log immutable DEBIT wallet ledger transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        amount: sellingPricePaisa,
        balanceBefore,
        balanceAfter,
        reference: orderNumber,
        description: `Free Fire Topup - ${product.name} (UID: ${trimmedUid})`,
      },
    });

    // 11. Log initial OrderEvent
    await tx.orderEvent.create({
      data: {
        orderId: createdOrder.id,
        fromStatus: null,
        toStatus: "PROCESSING",
        note: "Order created and paid via NPR Wallet",
        triggeredBy: userId,
      },
    });

    return {
      order: {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        game: createdOrder.game,
        productNameSnapshot: createdOrder.productNameSnapshot,
        productTypeSnapshot: createdOrder.productTypeSnapshot,
        productAmountSnapshot: createdOrder.productAmountSnapshot,
        freeFireUid: createdOrder.freeFireUid,
        gamePlayerName: createdOrder.gamePlayerName,
        sellingPricePaisa: createdOrder.sellingPricePaisa,
        priceFormatted: formatNPR(createdOrder.sellingPricePaisa),
        status: createdOrder.status,
        createdAt: createdOrder.createdAt,
        updatedAt: createdOrder.updatedAt,
        completedAt: createdOrder.completedAt,
      },
      duplicate: false,
    };
  });
}

import { refundWalletForOrder } from "@/server/services/wallet";

/**
 * Processes an automatic full refund for a failed order.
 * Delegates to atomic `refundWalletForOrder` in wallet service.
 */
export async function processOrderRefund(
  orderId: string,
  reason = "Automatic refund for failed Free Fire top-up"
) {
  return refundWalletForOrder(orderId, reason);
}

/**
 * Fetch paginated customer order history for the logged-in user.
 */
export async function getUserOrders(
  userId: string,
  page = 1,
  limit = 10
): Promise<PaginatedResult<CustomerOrderDisplay>> {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  const mappedItems: CustomerOrderDisplay[] = items.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    game: o.game,
    productNameSnapshot: o.productNameSnapshot,
    productTypeSnapshot: o.productTypeSnapshot,
    productAmountSnapshot: o.productAmountSnapshot,
    freeFireUid: o.freeFireUid,
    gamePlayerName: o.gamePlayerName,
    sellingPricePaisa: o.sellingPricePaisa,
    priceFormatted: formatNPR(o.sellingPricePaisa),
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    completedAt: o.completedAt,
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
 * Fetch a single order detail for a customer (user isolated).
 */
export async function getUserOrderByNumber(
  userId: string,
  orderNumber: string
): Promise<CustomerOrderDisplay | null> {
  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      userId,
    },
    include: {
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return null;

  const eventsDisplay: OrderEventDisplay[] = order.events.map((e) => ({
    id: e.id,
    orderId: e.orderId,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    note: e.note,
    triggeredBy: e.triggeredBy,
    createdAt: e.createdAt,
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    game: order.game,
    productNameSnapshot: order.productNameSnapshot,
    productTypeSnapshot: order.productTypeSnapshot,
    productAmountSnapshot: order.productAmountSnapshot,
    freeFireUid: order.freeFireUid,
    gamePlayerName: order.gamePlayerName,
    sellingPricePaisa: order.sellingPricePaisa,
    priceFormatted: formatNPR(order.sellingPricePaisa),
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    completedAt: order.completedAt,
    events: eventsDisplay,
  };
}

// ─── Admin Order Service Functions ───────────────────────────────────────────

/**
 * Fetch paginated orders across all users for admin view (includes user email, supplier costs, profit margins).
 */
export async function getAdminOrders(options?: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
}): Promise<PaginatedResult<AdminOrderDisplay>> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const search = options?.search?.trim();

  const where: Record<string, unknown> = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { freeFireUid: { contains: search, mode: "insensitive" } },
      { productNameSnapshot: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const mappedItems: AdminOrderDisplay[] = items.map((o) => {
    const profitPaisa =
      typeof o.supplierCostPaisa === "number"
        ? o.sellingPricePaisa - o.supplierCostPaisa
        : null;

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      userId: o.userId,
      userEmail: o.user.email,
      userName: o.user.name,
      game: o.game,
      productNameSnapshot: o.productNameSnapshot,
      productTypeSnapshot: o.productTypeSnapshot,
      productAmountSnapshot: o.productAmountSnapshot,
      freeFireUid: o.freeFireUid,
      gamePlayerName: o.gamePlayerName,
      sellingPricePaisa: o.sellingPricePaisa,
      priceFormatted: formatNPR(o.sellingPricePaisa),
      supplierCostPaisa: o.supplierCostPaisa,
      costFormatted: o.supplierCostPaisa !== null ? formatNPR(o.supplierCostPaisa) : null,
      profitPaisa,
      profitFormatted: profitPaisa !== null ? formatNPR(profitPaisa) : null,
      supplierCommandSnapshot: o.supplierCommandSnapshot,
      status: o.status,
      supplierOrderId: o.supplierOrderId,
      providerData: o.providerData,
      idempotencyKey: o.idempotencyKey,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      completedAt: o.completedAt,
    };
  });

  return {
    items: mappedItems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Fetch detailed single order for admin view (includes price snapshots, profit margins, events & provider logs).
 */
export async function getAdminOrderByNumber(
  orderNumber: string
): Promise<AdminOrderDisplay | null> {
  const o = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      user: { select: { name: true, email: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!o) return null;

  const profitPaisa =
    typeof o.supplierCostPaisa === "number"
      ? o.sellingPricePaisa - o.supplierCostPaisa
      : null;

  const eventsDisplay: OrderEventDisplay[] = o.events.map((e) => ({
    id: e.id,
    orderId: e.orderId,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    note: e.note,
    triggeredBy: e.triggeredBy,
    createdAt: e.createdAt,
  }));

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    userEmail: o.user.email,
    userName: o.user.name,
    game: o.game,
    productNameSnapshot: o.productNameSnapshot,
    productTypeSnapshot: o.productTypeSnapshot,
    productAmountSnapshot: o.productAmountSnapshot,
    freeFireUid: o.freeFireUid,
    gamePlayerName: o.gamePlayerName,
    sellingPricePaisa: o.sellingPricePaisa,
    priceFormatted: formatNPR(o.sellingPricePaisa),
    supplierCostPaisa: o.supplierCostPaisa,
    costFormatted: o.supplierCostPaisa !== null ? formatNPR(o.supplierCostPaisa) : null,
    profitPaisa,
    profitFormatted: profitPaisa !== null ? formatNPR(profitPaisa) : null,
    supplierCommandSnapshot: o.supplierCommandSnapshot,
    status: o.status,
    supplierOrderId: o.supplierOrderId,
    providerData: o.providerData,
    idempotencyKey: o.idempotencyKey,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    completedAt: o.completedAt,
    events: eventsDisplay,
  };
}
