import "dotenv/config";
import { processOrderRefund } from "../src/server/services/order";
import { getWalletBalance } from "../src/server/services/wallet";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const orderNumber = "ST-20260813-13063";
  console.log(`Processing automatic refund for test order ${orderNumber}...`);

  const order = await prisma.order.findFirst({
    where: { orderNumber },
  });

  if (!order) {
    console.error(`Order ${orderNumber} not found.`);
    process.exit(1);
  }

  const result = await processOrderRefund(order.id, "Automatic refund for failed Free Fire top-up");
  console.log("Refund Result:", result);

  const updatedWallet = await getWalletBalance(order.userId);
  console.log("Updated Customer Wallet Balance:", updatedWallet);

  const walletTxList = await prisma.walletTransaction.findMany({
    where: { reference: orderNumber },
  });
  console.log("Wallet Transactions for Order:", JSON.stringify(walletTxList, null, 2));

  const orderEvents = await prisma.orderEvent.findMany({
    where: { orderId: order.id },
  });
  console.log("Order Events Timeline:", JSON.stringify(orderEvents, null, 2));
}

main().catch(console.error);
