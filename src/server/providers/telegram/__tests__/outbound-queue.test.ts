import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { processOutboundQueue } from "../outbound-queue";
import { createAndPayOrder } from "@/server/services/order";
import { creditWallet } from "@/server/services/wallet";
import { getActiveCustomerProducts, createProduct } from "@/server/services/product";
import { prisma } from "@/lib/db/prisma";

describe("Database-Backed Telegram Outbound Fulfillment Queue", { timeout: 30000 }, () => {
  let testUser: { id: string; email: string };
  let testProduct: { id: string; supplierCommand: string };

  beforeAll(async () => {
    // Create test user with unique email
    const email = `queue_test_${Date.now()}@example.com`;
    testUser = await prisma.user.create({
      data: {
        email,
        name: "Outbound Queue Tester",
        role: "USER",
      },
    });

    // Ensure wallet exists and credit balance
    await creditWallet({
      userId: testUser.id,
      amountPaisa: 50000,
      description: "Init queue test wallet",
      idempotencyKey: `init_queue_${Date.now()}`,
    });

    // Create test product
    testProduct = await createProduct({
      name: "Queue Test 25 Diamonds",
      game: "FREE_FIRE_BD",
      type: "DIAMONDS",
      amount: 25,
      sellingPriceRupees: 28,
      supplierCostRupees: 25,
      supplierCommand: "bduc {uid} 25",
      sortOrder: 0,
      active: true,
    });
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
    }
  });

  beforeEach(() => {
    delete process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED;
  });

  it("13. TELEGRAM_AUTO_FULFILLMENT_ENABLED=false prevents all outbound sends", async () => {
    process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED = "false";

    const { order } = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: "2131711307",
      idempotencyKey: `queue_test_disabled_${Date.now()}`,
    });

    const mockSendMessage = vi.fn();
    const results = await processOutboundQueue({
      client: { sendMessage: mockSendMessage },
      targetGroup: "SR2298 Nepal",
      orderId: order.id,
    });

    expect(results.length).toBe(1);
    expect(results[0].status).toBe("SKIPPED_DISABLED");
    expect(mockSendMessage).not.toHaveBeenCalled();

    // Verify order remains PROCESSING
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.status).toBe("PROCESSING");
  });

  it("1 & 8. PROCESSING order is eligible and performs correct {uid} substitution", async () => {
    process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED = "true";

    const { order } = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey: `queue_test_eligible_${Date.now()}`,
    });

    const mockSendMessage = vi.fn().mockResolvedValue({ id: 991823 });

    const results = await processOutboundQueue({
      client: { sendMessage: mockSendMessage },
      targetGroup: "SR2298 Nepal",
      orderId: order.id,
    });

    const orderResult = results.find((r) => r.orderId === order.id);
    expect(orderResult).toBeDefined();
    expect(orderResult?.status).toBe("DISPATCHED");
    expect(orderResult?.formattedCommand).toBe("bduc 3125514892 25");
    expect(orderResult?.telegramMessageId).toBe(991823);

    expect(mockSendMessage).toHaveBeenCalledWith("SR2298 Nepal", {
      message: "bduc 3125514892 25",
    });

    // Verify order remains PROCESSING until supplier reply correlation
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.status).toBe("PROCESSING");
  });

  it("2, 3, 4. COMPLETED, FAILED, and REFUNDED orders are ignored by outbound queue", async () => {
    process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED = "true";

    // Create order and manually set to COMPLETED
    const { order: completedOrder } = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey: `queue_test_completed_${Date.now()}`,
    });
    await prisma.order.update({
      where: { id: completedOrder.id },
      data: { status: "COMPLETED" },
    });

    // Create order and manually set to FAILED
    const { order: failedOrder } = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey: `queue_test_failed_${Date.now()}`,
    });
    await prisma.order.update({
      where: { id: failedOrder.id },
      data: { status: "FAILED" },
    });

    // Create order and manually set to REFUNDED
    const { order: refundedOrder } = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey: `queue_test_refunded_${Date.now()}`,
    });
    await prisma.order.update({
      where: { id: refundedOrder.id },
      data: { status: "REFUNDED" },
    });

    const mockSendMessage = vi.fn();
    const resComp = await processOutboundQueue({
      client: { sendMessage: mockSendMessage },
      targetGroup: "SR2298 Nepal",
      orderId: completedOrder.id,
    });
    const resFail = await processOutboundQueue({
      client: { sendMessage: mockSendMessage },
      targetGroup: "SR2298 Nepal",
      orderId: failedOrder.id,
    });
    const resRef = await processOutboundQueue({
      client: { sendMessage: mockSendMessage },
      targetGroup: "SR2298 Nepal",
      orderId: refundedOrder.id,
    });

    expect(resComp.length).toBe(0);
    expect(resFail.length).toBe(0);
    expect(resRef.length).toBe(0);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("5 & 7. Existing outbound ProviderLog prevents duplicate dispatch (Exactly one Telegram command)", async () => {
    process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED = "true";

    const { order } = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey: `queue_test_once_${Date.now()}`,
    });

    const mockSendMessage = vi.fn().mockResolvedValue({ id: 1001 });

    // First iteration: Dispatches command
    const results1 = await processOutboundQueue({
      client: { sendMessage: mockSendMessage },
      targetGroup: "SR2298 Nepal",
      orderId: order.id,
    });
    expect(results1.find((r) => r.orderId === order.id)?.status).toBe("DISPATCHED");
    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    // Second iteration: Order has existing ProviderLog -> Ignored!
    mockSendMessage.mockClear();
    const results2 = await processOutboundQueue({
      client: { sendMessage: mockSendMessage },
      targetGroup: "SR2298 Nepal",
      orderId: order.id,
    });
    expect(results2.find((r) => r.orderId === order.id)).toBeUndefined();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("6. Concurrent workers cannot claim the same order (Atomic Idempotency)", async () => {
    process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED = "true";

    const { order } = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey: `queue_test_concurrent_${Date.now()}`,
    });

    const mockSendMessage1 = vi.fn().mockResolvedValue({ id: 2001 });
    const mockSendMessage2 = vi.fn().mockResolvedValue({ id: 2002 });

    // Simulate 2 parallel processOutboundQueue calls competing for the same order
    const [res1, res2] = await Promise.all([
      processOutboundQueue({
        client: { sendMessage: mockSendMessage1 },
        targetGroup: "SR2298 Nepal",
        orderId: order.id,
      }),
      processOutboundQueue({
        client: { sendMessage: mockSendMessage2 },
        targetGroup: "SR2298 Nepal",
        orderId: order.id,
      }),
    ]);

    const orderRes1 = res1.find((r) => r.orderId === order.id);
    const orderRes2 = res2.find((r) => r.orderId === order.id);

    const dispatchedCount = [orderRes1, orderRes2].filter((r) => r?.status === "DISPATCHED").length;
    const claimFailedCount = [orderRes1, orderRes2].filter((r) => r?.status === "CLAIM_FAILED").length;

    expect(dispatchedCount).toBe(1);
    expect(claimFailedCount).toBe(1);

    // Exactly one Telegram message sent across parallel workers
    const totalCalls = mockSendMessage1.mock.calls.length + mockSendMessage2.mock.calls.length;
    expect(totalCalls).toBe(1);
  });

  it("9. Telegram send failure records failure and does not falsely complete the order", async () => {
    process.env.TELEGRAM_AUTO_FULFILLMENT_ENABLED = "true";

    const { order } = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: "3125514892",
      idempotencyKey: `queue_test_send_fail_${Date.now()}`,
    });

    const mockSendMessage = vi.fn().mockRejectedValue(new Error("RPC_CALL_TIMEOUT"));

    const results = await processOutboundQueue({
      client: { sendMessage: mockSendMessage },
      targetGroup: "SR2298 Nepal",
      orderId: order.id,
    });

    const orderResult = results.find((r) => r.orderId === order.id);
    expect(orderResult?.status).toBe("SEND_FAILED");
    expect(orderResult?.error).toBe("RPC_CALL_TIMEOUT");

    // Order status must remain PROCESSING (not falsely COMPLETED)
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.status).toBe("PROCESSING");

    // ProviderLog records failure details
    const providerLog = await prisma.providerLog.findFirst({
      where: { orderId: order.id },
    });
    expect(providerLog?.success).toBe(false);
    expect(providerLog?.errorMessage).toContain("RPC_CALL_TIMEOUT");
  });
});
