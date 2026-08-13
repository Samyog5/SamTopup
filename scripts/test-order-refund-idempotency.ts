import "dotenv/config";
import { refundWalletForOrder, getWalletBalance } from "../src/server/services/wallet";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const orderNumber = "ST-20260813-13063";
  console.log(`==================================================`);
  console.log(` Testing Refund Idempotency for Order ${orderNumber}`);
  console.log(`==================================================\n`);

  const order = await prisma.order.findFirst({
    where: { orderNumber },
  });

  if (!order) {
    console.error(`Order ${orderNumber} not found.`);
    process.exit(1);
  }

  // 1. Check wallet balance before refund
  const initialWallet = await getWalletBalance(order.userId);
  console.log(`1. Initial Wallet Balance: ${initialWallet.formatted} (${initialWallet.balance} paisa)`);

  // 2. Perform First Refund Call
  console.log("\n2. Executing FIRST refund call...");
  const res1 = await refundWalletForOrder(order.id, "Automatic refund for failed Free Fire top-up");
  console.log("First Refund Call Result:", res1);

  const postWallet1 = await getWalletBalance(order.userId);
  console.log(`Wallet Balance After First Call: ${postWallet1.formatted} (${postWallet1.balance} paisa)`);

  // 3. Perform SECOND Refund Call (Idempotency Test)
  console.log("\n3. Executing SECOND refund call (Idempotency Check)...");
  const res2 = await refundWalletForOrder(order.id, "Automatic refund for failed Free Fire top-up");
  console.log("Second Refund Call Result:", res2);

  const postWallet2 = await getWalletBalance(order.userId);
  console.log(`Wallet Balance After Second Call: ${postWallet2.formatted} (${postWallet2.balance} paisa)`);

  // 4. Verify Database Integrity
  const finalOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { events: true },
  });

  const walletTxs = await prisma.walletTransaction.findMany({
    where: { reference: orderNumber },
  });

  console.log("\n==================================================");
  console.log(" VERIFICATION CHECKS                             ");
  console.log("==================================================");
  console.log(`- Final Order Status: ${finalOrder?.status} (Expected: REFUNDED)`);
  console.log(`- Wallet Balance Unchanged on Second Call: ${postWallet1.balance === postWallet2.balance ? "YES" : "NO"}`);
  console.log(`- Duplicate Flag on Second Call: ${res2.duplicate ? "YES" : "NO"}`);
  console.log(`- Total Wallet Transactions for Order: ${walletTxs.length}`);
  walletTxs.forEach((t) => {
    console.log(`  * ${t.type}: ${t.amount / 100} NPR | Reference: ${t.reference} | IdempotencyKey: ${t.idempotencyKey}`);
  });
  console.log("==================================================\n");
}

main().catch(console.error);
