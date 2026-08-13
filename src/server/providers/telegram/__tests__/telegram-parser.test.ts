import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { formatSupplierCommand } from "../formatter";
import { parseSupplierResponse } from "../parser";
import { correlateAndFulfillOrder } from "../correlator";
import { createAndPayOrder } from "@/server/services/order";
import { creditWallet } from "@/server/services/wallet";
import { getActiveCustomerProducts, createProduct } from "@/server/services/product";
import { prisma } from "@/lib/db/prisma";

describe("Telegram Command Formatter", () => {
  it("substitutes {uid} placeholder with validated Free Fire Player UID", () => {
    expect(formatSupplierCommand("bduc {uid} 25", "3125514892")).toBe("bduc 3125514892 25");
    expect(formatSupplierCommand("bduc {uid} 115", "3125514892")).toBe("bduc 3125514892 115");
    expect(formatSupplierCommand("bduc {uid} weekly", "3125514892")).toBe("bduc 3125514892 weekly");
    expect(formatSupplierCommand("bduc {uid} monthly", "3125514892")).toBe("bduc 3125514892 monthly");
  });

  it("trims whitespace from UID", () => {
    expect(formatSupplierCommand("bduc {uid} 115", "  3125514892  ")).toBe("bduc 3125514892 115");
  });

  it("throws error for non-numeric UID or invalid template", () => {
    expect(() => formatSupplierCommand("bduc {uid} 115", "abc")).toThrow("must contain only numeric digits");
    expect(() => formatSupplierCommand("bduc 115", "3125514892")).toThrow("must contain the {uid} placeholder");
  });
});

describe("Telegram Defensive Supplier Response Parser", () => {
  it("successfully parses standard TOPUP DONE supplier response with Free Fire player name", () => {
    const rawMsg = `TOPUP DONE

Order ID : #6525
User     : SMUGGLER
UID      : 3125514892

UPBD-Q-S-02690368 8756-4674-7943-2555 Delivered

Package  : 20 Unipin Code × 1
Duration : 10.67s`;

    const parsed = parseSupplierResponse(rawMsg);

    expect(parsed.status).toBe("SUCCESS");
    expect(parsed.supplierOrderId).toBe("#6525");
    expect(parsed.freeFireUid).toBe("3125514892");
    expect(parsed.gamePlayerName).toBe("SMUGGLER");
    expect(parsed.packageName).toBe("20 Unipin Code × 1");
    expect(parsed.deliveryStatus).toBe("Delivered");
  });

  it("parses player names containing spaces", () => {
    const rawMsg = `TOPUP DONE
Order ID : #6526
User     : DARK KNIGHT 99
UID      : 3125514892
Delivered`;

    const parsed = parseSupplierResponse(rawMsg);
    expect(parsed.gamePlayerName).toBe("DARK KNIGHT 99");
    expect(parsed.freeFireUid).toBe("3125514892");
  });

  it("parses player names containing numbers and special characters", () => {
    const rawMsg = `TOPUP DONE
Order ID : #6527
User     : ꧁༺Sαmуog_99༻꧂
UID      : 3125514892
Delivered`;

    const parsed = parseSupplierResponse(rawMsg);
    expect(parsed.gamePlayerName).toBe("꧁༺Sαmуog_99༻꧂");
  });

  it("returns null for gamePlayerName when User field is missing", () => {
    const rawMsg = `TOPUP DONE
Order ID : #6528
UID      : 3125514892
Delivered`;

    const parsed = parseSupplierResponse(rawMsg);
    expect(parsed.gamePlayerName).toBeNull();
    expect(parsed.freeFireUid).toBe("3125514892");
  });

  it("returns null for freeFireUid when UID field is missing", () => {
    const rawMsg = `TOPUP DONE
Order ID : #6529
User     : SMUGGLER
Delivered`;

    const parsed = parseSupplierResponse(rawMsg);
    expect(parsed.freeFireUid).toBeNull();
    expect(parsed.gamePlayerName).toBe("SMUGGLER");
  });

  it("parses explicit FAILED supplier response and preserves raw message", () => {
    const rawMsg = `TOPUP FAILED

Order ID : #6530
UID      : 9999999999
Reason   : Invalid Player UID / Account Not Found

Delivered : Failed`;

    const parsed = parseSupplierResponse(rawMsg);

    expect(parsed.status).toBe("FAILED");
    expect(parsed.supplierOrderId).toBe("#6530");
    expect(parsed.freeFireUid).toBe("9999999999");
    expect(parsed.gamePlayerName).toBeNull();
  });

  it("returns UNKNOWN for unrelated or chat messages", () => {
    const rawMsg = "Hello team, please check the rate for weekly membership.";
    const parsed = parseSupplierResponse(rawMsg);

    expect(parsed.status).toBe("UNKNOWN");
    expect(parsed.supplierOrderId).toBeNull();
    expect(parsed.freeFireUid).toBeNull();
    expect(parsed.gamePlayerName).toBeNull();
  });
});

describe("Telegram Order Correlation & State Machine", () => {
  let testUser: { id: string };
  let testProduct: { id: string };

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        name: "Telegram Correlator Test User",
        email: `tg_corr_${Date.now()}@example.com`,
      },
    });

    const active = await getActiveCustomerProducts("FREE_FIRE_BD");
    if (active.length > 0) {
      testProduct = active[0];
    } else {
      testProduct = await createProduct({
        name: "115 Diamonds TG Test",
        game: "FREE_FIRE_BD",
        type: "DIAMONDS",
        amount: 115,
        sellingPriceRupees: 105,
        supplierCommand: "bduc {uid} 115",
        sortOrder: 1,
        active: true,
      });
    }

    // Fund test user wallet
    await creditWallet({
      userId: testUser.id,
      amountPaisa: 100000,
      description: "Correlator test funding",
    });
  });

  afterAll(async () => {
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  it("correlates successful supplier response and moves order to COMPLETED", async () => {
    const testUid = "9876543210";

    // 1. Create order in PROCESSING status
    const created = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: testUid,
      idempotencyKey: `tg_corr_success_${Date.now()}`,
    });

    expect(created.order.status).toBe("PROCESSING");

    // 2. Parse supplier SUCCESS response for UID
    const rawMsg = `TOPUP DONE

Order ID : #8801
User     : SMUGGLER
UID      : ${testUid}

UPBD-Q-S-9999 Delivered`;

    const parsed = parseSupplierResponse(rawMsg);
    expect(parsed.status).toBe("SUCCESS");
    expect(parsed.gamePlayerName).toBe("SMUGGLER");

    // 3. Run correlation
    const result = await correlateAndFulfillOrder(parsed);

    expect(result.matched).toBe(true);
    expect(result.orderId).toBe(created.order.id);
    expect(result.newStatus).toBe("COMPLETED");

    // 4. Verify DB state
    const updatedOrder = await prisma.order.findUnique({
      where: { id: created.order.id },
      include: { events: true },
    });

    expect(updatedOrder?.status).toBe("COMPLETED");
    expect(updatedOrder?.supplierOrderId).toBe("#8801");
    expect(updatedOrder?.gamePlayerName).toBe("SMUGGLER");
    expect(updatedOrder?.completedAt).not.toBeNull();
    expect(updatedOrder?.events.some((e) => e.toStatus === "COMPLETED")).toBe(true);
  });

  it("correlates failed supplier response and moves order to FAILED", async () => {
    const testUid = "7777777777";

    const created = await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: testUid,
      idempotencyKey: `tg_corr_fail_${Date.now()}`,
    });

    const rawMsg = `TOPUP FAILED

Order ID : #8802
UID      : ${testUid}
Reason   : Account Error`;

    const parsed = parseSupplierResponse(rawMsg);
    const result = await correlateAndFulfillOrder(parsed);

    expect(result.matched).toBe(true);
    expect(result.newStatus).toBe("REFUNDED");

    const updatedOrder = await prisma.order.findUnique({ where: { id: created.order.id } });
    expect(updatedOrder?.status).toBe("REFUNDED");
  });

  it("moves order to MANUAL_REVIEW when correlation is ambiguous", async () => {
    const testUid = "5555555555";

    // Create 2 simultaneous orders for same UID
    await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: testUid,
      idempotencyKey: `tg_ambig_1_${Date.now()}`,
    });

    await createAndPayOrder({
      userId: testUser.id,
      productId: testProduct.id,
      freeFireUid: testUid,
      idempotencyKey: `tg_ambig_2_${Date.now()}`,
    });

    const rawMsg = `TOPUP DONE

Order ID : #8803
UID      : ${testUid}
Delivered`;

    const parsed = parseSupplierResponse(rawMsg);
    const result = await correlateAndFulfillOrder(parsed);

    expect(result.matched).toBe(true);
    // Because multiple processing orders existed for the same UID, correlation is ambiguous -> MANUAL_REVIEW
    expect(result.newStatus).toBe("MANUAL_REVIEW");

    expect(result.orderId).toBeDefined();
    const updatedOrder = await prisma.order.findUnique({ where: { id: result.orderId! } });
    expect(updatedOrder?.status).toBe("MANUAL_REVIEW");
  });
});

describe("Telegram GramJS Event Filtering", () => {
  it("accepts resolved InputPeer objects in NewMessage chats filter without throwing", async () => {
    const { NewMessage } = await import("telegram/events");
    const fakeInputPeer = {
      CONSTRUCTOR_ID: 900291769,
      SUBCLASS_OF_ID: 3374092470,
      className: "InputPeerChat",
      classType: "constructor",
      chatId: BigInt("5499983034"),
    };

    const filter = new NewMessage({ chats: [fakeInputPeer as any] });
    expect(filter).toBeDefined();
    expect(filter.chats).toBeDefined();
    expect(filter.chats?.length).toBe(1);
  });
});

