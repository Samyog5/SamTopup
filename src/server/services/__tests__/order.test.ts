import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createAndPayOrder,
  getUserOrders,
  getUserOrderByNumber,
} from "@/server/services/order";
import { creditWallet, getWalletBalance } from "@/server/services/wallet";
import { getActiveCustomerProducts, createProduct } from "@/server/services/product";
import { prisma } from "@/lib/db/prisma";
import type { ProductCustomerDisplay } from "@/types";

describe("Order & Wallet Payment System", () => {
  let testUserAId: string;
  let testUserBId: string;
  let testAdminId: string;
  let sampleProduct: ProductCustomerDisplay;

  beforeAll(async () => {
    // Create test users
    const userA = await prisma.user.create({
      data: {
        name: "Order Test User A",
        email: `ordertest_a_${Date.now()}@example.com`,
      },
    });
    testUserAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        name: "Order Test User B",
        email: `ordertest_b_${Date.now()}@example.com`,
      },
    });
    testUserBId = userB.id;

    const admin = await prisma.user.create({
      data: {
        name: "Order Test Admin",
        email: `orderadmin_${Date.now()}@example.com`,
        role: "ADMIN",
      },
    });
    testAdminId = admin.id;

    // Fetch seeded product or create sample
    const activeProducts = await getActiveCustomerProducts("FREE_FIRE_BD");
    if (activeProducts.length > 0) {
      sampleProduct = activeProducts[0];
    } else {
      const created = await createProduct({
        name: "115 Diamonds Test",
        game: "FREE_FIRE_BD",
        type: "DIAMONDS",
        amount: 115,
        sellingPriceRupees: 105,
        supplierCostRupees: 90,
        supplierCommand: "bduc {uid} 115",
        sortOrder: 1,
        active: true,
      });
      sampleProduct = created;
    }
  });

  afterAll(async () => {
    const testIds = [testUserAId, testUserBId, testAdminId].filter(Boolean);
    if (testIds.length > 0) {
      const testOrders = await prisma.order.findMany({ where: { userId: { in: testIds } } });
      const testOrderIds = testOrders.map((o) => o.id);
      const testProductIds = testOrders.map((o) => o.productId);

      if (testOrderIds.length > 0) {
        await prisma.orderEvent.deleteMany({ where: { orderId: { in: testOrderIds } } }).catch(() => {});
        await prisma.providerLog.deleteMany({ where: { orderId: { in: testOrderIds } } }).catch(() => {});
        await prisma.order.deleteMany({ where: { id: { in: testOrderIds } } }).catch(() => {});
      }

      await prisma.user.deleteMany({ where: { id: { in: testIds } } }).catch(() => {});

      if (testProductIds.length > 0) {
        await prisma.product.deleteMany({
          where: { id: { in: testProductIds } },
        }).catch(() => {});
      }
    }

    await prisma.product.deleteMany({
      where: { OR: [{ name: { contains: "Test" } }, { name: { contains: "Snapshot" } }] },
    }).catch(() => {});
  });

  it("successfully creates an order and debits wallet atomically", async () => {
    const fundingPaisa = 50000; // Rs. 500.00
    const pricePaisa = sampleProduct.sellingPricePaisa;

    // 1. Credit User A wallet with Rs. 500 (50000 paisa)
    await creditWallet({
      userId: testUserAId,
      amountPaisa: fundingPaisa,
      description: "Initial test funding",
      idempotencyKey: `fund_usera_${Date.now()}`,
      adminId: testAdminId,
    });

    const initialBalance = await getWalletBalance(testUserAId);
    expect(initialBalance.balance).toBe(fundingPaisa);

    // 2. Execute order payment
    const idempotencyKey = `pay_order_test_${Date.now()}`;
    const result = await createAndPayOrder({
      userId: testUserAId,
      productId: sampleProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey,
    });

    expect(result.duplicate).toBe(false);
    expect(result.order.status).toBe("PROCESSING");
    expect(result.order.freeFireUid).toBe("3125514892");
    expect(result.order.sellingPricePaisa).toBe(pricePaisa);

    // 3. Verify wallet balance after payment: fundingPaisa - pricePaisa
    const postBalance = await getWalletBalance(testUserAId);
    expect(postBalance.balance).toBe(fundingPaisa - pricePaisa);

    // 4. Verify wallet transaction reference matches order number
    const walletObj = await prisma.wallet.findUnique({ where: { userId: testUserAId } });
    const tx = await prisma.walletTransaction.findFirst({
      where: { walletId: walletObj?.id, type: "DEBIT" },
      orderBy: { createdAt: "desc" },
    });

    expect(tx).toBeDefined();
    expect(tx?.reference).toBe(result.order.orderNumber);
  });

  it("enforces server-side idempotency on duplicate payment requests", async () => {
    const idempotencyKey = `idem_test_${Date.now()}`;

    // Ensure User A has sufficient balance for test
    await creditWallet({
      userId: testUserAId,
      amountPaisa: 20000,
      description: "Idempotency test funding",
      idempotencyKey: `fund_idem_${Date.now()}`,
    });

    // First attempt
    const res1 = await createAndPayOrder({
      userId: testUserAId,
      productId: sampleProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey,
    });
    expect(res1.duplicate).toBe(false);

    const balanceBeforeSecondAttempt = await getWalletBalance(testUserAId);

    // Second attempt with SAME idempotency key
    const res2 = await createAndPayOrder({
      userId: testUserAId,
      productId: sampleProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey,
    });

    expect(res2.duplicate).toBe(true);
    expect(res2.order.orderNumber).toBe(res1.order.orderNumber);

    // Verify wallet was NOT debited twice
    const balanceAfterSecondAttempt = await getWalletBalance(testUserAId);
    expect(balanceAfterSecondAttempt.balance).toBe(balanceBeforeSecondAttempt.balance);
  });

  it("rejects payment when wallet balance is insufficient", async () => {
    // User B has 0 wallet balance
    await expect(
      createAndPayOrder({
        userId: testUserBId,
        productId: sampleProduct.id,
        freeFireUid: "9999999999",
      })
    ).rejects.toThrow("INSUFFICIENT_BALANCE");

    const userBBalance = await getWalletBalance(testUserBId);
    expect(userBBalance.balance).toBe(0);

    const userBOrders = await getUserOrders(testUserBId);
    expect(userBOrders.total).toBe(0);
  });

  it("rejects payment for inactive products without debiting wallet", async () => {
    // Create inactive product
    const inactiveProd = await createProduct({
      name: "Inactive Test Diamond",
      game: "FREE_FIRE_BD",
      type: "DIAMONDS",
      amount: 50,
      sellingPriceRupees: 50,
      supplierCommand: "bduc {uid} 50",
      sortOrder: 99,
      active: false,
    });

    const balanceBefore = await getWalletBalance(testUserAId);

    await expect(
      createAndPayOrder({
        userId: testUserAId,
        productId: inactiveProd.id,
        freeFireUid: "1234567890",
      })
    ).rejects.toThrow("This product is currently unavailable");

    const balanceAfter = await getWalletBalance(testUserAId);
    expect(balanceAfter.balance).toBe(balanceBefore.balance);
  });

  it("preserves historical price snapshot when product price changes later", async () => {
    // Ensure funding
    await creditWallet({
      userId: testUserAId,
      amountPaisa: 20000,
      description: "Snapshot test funding",
      idempotencyKey: `fund_snap_${Date.now()}`,
    });

    // Create temp product with initial price Rs. 100
    const tempProd = await createProduct({
      name: "Snapshot Test Diamond",
      game: "FREE_FIRE_BD",
      type: "DIAMONDS",
      amount: 100,
      sellingPriceRupees: 100,
      supplierCostRupees: 80,
      supplierCommand: "bduc {uid} 100",
      sortOrder: 100,
      active: true,
    });

    // Create order at Rs. 100 (10000 paisa)
    const result = await createAndPayOrder({
      userId: testUserAId,
      productId: tempProd.id,
      freeFireUid: "8888888888",
    });

    expect(result.order.sellingPricePaisa).toBe(10000);

    // Now update product price to Rs. 200 in DB
    await prisma.product.update({
      where: { id: tempProd.id },
      data: { sellingPricePaisa: 20000 },
    });

    // Fetch existing order: price snapshot must STILL be Rs. 100 (10000 paisa)
    const fetchedOrder = await getUserOrderByNumber(testUserAId, result.order.orderNumber);
    expect(fetchedOrder).toBeDefined();
    expect(fetchedOrder?.sellingPricePaisa).toBe(10000);
    expect(fetchedOrder?.priceFormatted).toBe("Rs. 100.00");
  });

  it("enforces user isolation: User B cannot access User A order details", async () => {
    const userAOrders = await getUserOrders(testUserAId);
    expect(userAOrders.items.length).toBeGreaterThan(0);

    const userAOrderNumber = userAOrders.items[0].orderNumber;

    // User B attempts to access User A's order number
    const result = await getUserOrderByNumber(testUserBId, userAOrderNumber);
    expect(result).toBeNull();
  });

  describe("Automatic Order Refund Architecture & Idempotency", () => {
    it("refunds failed order atomically, creates CREDIT transaction, and sets status to REFUNDED", async () => {
      // 1. Fund user A with Rs. 200
      await creditWallet({
        userId: testUserAId,
        amountPaisa: 20000,
        description: "Refund test funding",
        idempotencyKey: `fund_rf_1_${Date.now()}`,
      });

      const balanceBeforeOrder = await getWalletBalance(testUserAId);

      // 2. Create order for Rs. 105 (10500 paisa)
      const orderRes = await createAndPayOrder({
        userId: testUserAId,
        productId: sampleProduct.id,
        freeFireUid: "3125514892",
        idempotencyKey: `pay_rf_1_${Date.now()}`,
      });

      const balanceAfterOrder = await getWalletBalance(testUserAId);
      expect(balanceAfterOrder.balance).toBe(balanceBeforeOrder.balance - sampleProduct.sellingPricePaisa);

      // 3. Mark order FAILED
      await prisma.order.update({
        where: { id: orderRes.order.id },
        data: { status: "FAILED" },
      });

      // 4. Import refundWalletForOrder & execute refund
      const { refundWalletForOrder } = await import("@/server/services/wallet");
      const refundRes = await refundWalletForOrder(orderRes.order.id, "Automatic refund test");

      expect(refundRes.refunded).toBe(true);
      expect(refundRes.duplicate).toBe(false);
      expect(refundRes.transaction.type).toBe("CREDIT");
      expect(refundRes.transaction.amount).toBe(sampleProduct.sellingPricePaisa);
      expect(refundRes.transaction.idempotencyKey).toBe(`refund:${orderRes.order.orderNumber}`);

      // 5. Verify wallet balance restored to balance before order
      const balanceAfterRefund = await getWalletBalance(testUserAId);
      expect(balanceAfterRefund.balance).toBe(balanceBeforeOrder.balance);

      // 6. Verify order status set to REFUNDED
      const updatedOrder = await prisma.order.findUnique({ where: { id: orderRes.order.id } });
      expect(updatedOrder?.status).toBe("REFUNDED");
    }, 15000);

    it("enforces deterministic idempotency refund:<orderNumber> on duplicate refund attempts", async () => {
      // Create order
      await creditWallet({
        userId: testUserAId,
        amountPaisa: 20000,
        idempotencyKey: `fund_rf_2_${Date.now()}`,
      });

      const orderRes = await createAndPayOrder({
        userId: testUserAId,
        productId: sampleProduct.id,
        freeFireUid: "3125514892",
        idempotencyKey: `pay_rf_2_${Date.now()}`,
      });

      const { refundWalletForOrder } = await import("@/server/services/wallet");

      // First refund call
      const res1 = await refundWalletForOrder(orderRes.order.id);
      expect(res1.refunded).toBe(true);
      expect(res1.duplicate).toBe(false);

      const balanceAfterFirstRefund = await getWalletBalance(testUserAId);

      // Second refund call (Duplicate)
      const res2 = await refundWalletForOrder(orderRes.order.id);
      expect(res2.refunded).toBe(false);
      expect(res2.duplicate).toBe(true);
      expect(res2.transaction.id).toBe(res1.transaction.id);

      // Balance must NOT increase a second time
      const balanceAfterSecondRefund = await getWalletBalance(testUserAId);
      expect(balanceAfterSecondRefund.balance).toBe(balanceAfterFirstRefund.balance);
    }, 15000);

    it("uses exact original paid amount for refund even if product price changes later", async () => {
      // Create product at Rs. 100
      const tempProd = await createProduct({
        name: "Refund Price Test Diamond",
        game: "FREE_FIRE_BD",
        type: "DIAMONDS",
        amount: 100,
        sellingPriceRupees: 100,
        supplierCommand: "bduc {uid} 100",
        sortOrder: 200,
        active: true,
      });

      await creditWallet({
        userId: testUserAId,
        amountPaisa: 20000,
        idempotencyKey: `fund_rf_3_${Date.now()}`,
      });

      // Customer pays Rs. 100 (10000 paisa)
      const orderRes = await createAndPayOrder({
        userId: testUserAId,
        productId: tempProd.id,
        freeFireUid: "1111111111",
        idempotencyKey: `pay_rf_3_${Date.now()}`,
      });
      expect(orderRes.order.sellingPricePaisa).toBe(10000);

      // Admin updates product price to Rs. 300 (30000 paisa)
      await prisma.product.update({
        where: { id: tempProd.id },
        data: { sellingPricePaisa: 30000 },
      });

      // Execute refund
      const { refundWalletForOrder } = await import("@/server/services/wallet");
      const refundRes = await refundWalletForOrder(orderRes.order.id);

      // Refund MUST be exactly Rs. 100 (10000 paisa), NOT Rs. 300 (30000 paisa)
      expect(refundRes.transaction.amount).toBe(10000);
    });
  });
});
