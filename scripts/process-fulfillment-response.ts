import "dotenv/config";
import { parseSupplierResponse } from "../src/server/providers/telegram/parser";
import { correlateAndFulfillOrder } from "../src/server/providers/telegram/correlator";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const rawMsg = `⚠️ Insufficient Balance
┌──────────────────────────┐
│ Wallet        : 0
│ Due Balance   : 0
│ Due Limit     : 0
│ Due Available : 0
└──────────────────────────┘`;

  const replyToMsgId = 5789;

  console.log("Parsing raw supplier response...");
  const parsed = parseSupplierResponse(rawMsg);
  console.log("Parsed Supplier Response:", parsed);

  console.log("\nRunning order correlation engine...");
  const result = await correlateAndFulfillOrder(parsed, replyToMsgId);
  console.log("Correlation Result:", result);

  const updatedOrder = await prisma.order.findFirst({
    where: { orderNumber: "ST-20260813-13063" },
    include: { events: true, providerLogs: true },
  });

  console.log("\nFinal Order State in PostgreSQL:", JSON.stringify(updatedOrder, null, 2));
}

main().catch(console.error);
