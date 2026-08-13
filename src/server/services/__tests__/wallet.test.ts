import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatNPR, paisaToRupees, rupeesToPaisa, isValidPaisa } from "@/lib/money";
import { creditWallet, debitWallet, getWalletBalance } from "@/server/services/wallet";
import { prisma } from "@/lib/db/prisma";

describe("NPR Money & Paisa Utilities", () => {
  it("converts rupees to paisa correctly without floating point errors", () => {
    expect(rupeesToPaisa(1.0)).toBe(100);
    expect(rupeesToPaisa(100.5)).toBe(10050);
    expect(rupeesToPaisa(1250.5)).toBe(125050);
  });

  it("converts paisa to rupees display string correctly", () => {
    expect(paisaToRupees(100)).toBe("1.00");
    expect(paisaToRupees(10050)).toBe("100.50");
    expect(paisaToRupees(125050)).toBe("1250.50");
  });

  it("formats paisa as formatted NPR strings with thousand separators", () => {
    expect(formatNPR(10000)).toBe("Rs. 100.00");
    expect(formatNPR(125050)).toBe("Rs. 1,250.50");
    expect(formatNPR(10000000)).toBe("Rs. 1,00,000.00");
  });

  it("validates positive safe integers for paisa", () => {
    expect(isValidPaisa(5000)).toBe(true);
    expect(isValidPaisa(0)).toBe(true);
    expect(isValidPaisa(-100)).toBe(false);
    expect(isValidPaisa(10.5)).toBe(false);
  });
});

describe("Wallet Service Core Operations", () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create a temporary test user for test isolated run
    const testEmail = `test_wallet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test Wallet User",
        wallet: { create: { balance: 50000 } }, // Initial Rs. 500.00 (50000 paisa)
      },
      include: { wallet: true },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  it("verifies initial balance", async () => {
    const balance = await getWalletBalance(testUserId);
    expect(balance.balance).toBe(50000);
    expect(balance.formatted).toBe("Rs. 500.00");
  });

  it("credits wallet: Rs. 500 + Rs. 1,000 -> Rs. 1,500", async () => {
    const creditAmountPaisa = 100000; // Rs. 1,000.00
    const result = await creditWallet({
      userId: testUserId,
      amountPaisa: creditAmountPaisa,
      description: "Test manual credit",
      reference: "TEST_CREDIT",
    });

    expect(result.duplicate).toBe(false);
    expect(result.transaction.balanceBefore).toBe(50000);
    expect(result.transaction.balanceAfter).toBe(150000);
    expect(result.transaction.amount).toBe(100000);
    expect(result.transaction.type).toBe("CREDIT");

    const newBalance = await getWalletBalance(testUserId);
    expect(newBalance.balance).toBe(150000);
    expect(newBalance.formatted).toBe("Rs. 1,500.00");
  });

  it("debits wallet: Rs. 500 - Rs. 200 -> Rs. 300", async () => {
    const debitAmountPaisa = 20000; // Rs. 200.00
    const result = await debitWallet({
      userId: testUserId,
      amountPaisa: debitAmountPaisa,
      description: "Test top-up debit",
      reference: "TEST_DEBIT",
    });

    expect(result.duplicate).toBe(false);
    expect(result.transaction.balanceBefore).toBe(50000);
    expect(result.transaction.balanceAfter).toBe(30000);
    expect(result.transaction.amount).toBe(20000);
    expect(result.transaction.type).toBe("DEBIT");

    const newBalance = await getWalletBalance(testUserId);
    expect(newBalance.balance).toBe(30000);
  });

  it("rejects debit when balance is insufficient (Rs. 500 - Rs. 600 -> Rejection)", async () => {
    const debitAmountPaisa = 60000; // Rs. 600.00 (user only has Rs. 500.00)

    await expect(
      debitWallet({
        userId: testUserId,
        amountPaisa: debitAmountPaisa,
        description: "Overspend attempt",
      })
    ).rejects.toThrow("INSUFFICIENT_BALANCE");

    // Verify balance remains unchanged at Rs. 500.00
    const balance = await getWalletBalance(testUserId);
    expect(balance.balance).toBe(50000);
  });

  it("enforces idempotency key on credit operations", async () => {
    const idempotencyKey = `test_idem_${Date.now()}`;
    const amountPaisa = 50000; // Rs. 500.00

    // First attempt
    const res1 = await creditWallet({
      userId: testUserId,
      amountPaisa,
      description: "Idempotent credit",
      idempotencyKey,
    });
    expect(res1.duplicate).toBe(false);
    expect(res1.transaction.balanceAfter).toBe(100000);

    // Duplicate attempt with SAME idempotency key
    const res2 = await creditWallet({
      userId: testUserId,
      amountPaisa,
      description: "Idempotent credit duplicate attempt",
      idempotencyKey,
    });

    expect(res2.duplicate).toBe(true);
    expect(res2.transaction.id).toBe(res1.transaction.id);

    // Verify balance was credited only ONCE (Rs. 1,000.00, NOT Rs. 1,500.00)
    const finalBalance = await getWalletBalance(testUserId);
    expect(finalBalance.balance).toBe(100000);
  });
});
