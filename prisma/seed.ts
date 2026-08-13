import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

export const INITIAL_PRODUCTS = [
  {
    name: "25 Diamonds",
    description: "25 Free Fire Diamonds",
    game: "FREE_FIRE_BD" as const,
    type: "DIAMONDS" as const,
    amount: 25,
    sellingPricePaisa: 3000, // Rs. 30.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} 25",
    sortOrder: 1,
    active: true,
  },
  {
    name: "50 Diamonds",
    description: "50 Free Fire Diamonds",
    game: "FREE_FIRE_BD" as const,
    type: "DIAMONDS" as const,
    amount: 50,
    sellingPricePaisa: 5000, // Rs. 50.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} 50",
    sortOrder: 2,
    active: true,
  },
  {
    name: "115 Diamonds",
    description: "115 Free Fire Diamonds",
    game: "FREE_FIRE_BD" as const,
    type: "DIAMONDS" as const,
    amount: 115,
    sellingPricePaisa: 10500, // Rs. 105.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} 115",
    sortOrder: 3,
    active: true,
  },
  {
    name: "240 Diamonds",
    description: "240 Free Fire Diamonds",
    game: "FREE_FIRE_BD" as const,
    type: "DIAMONDS" as const,
    amount: 240,
    sellingPricePaisa: 21000, // Rs. 210.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} 240",
    sortOrder: 4,
    active: true,
  },
  {
    name: "610 Diamonds",
    description: "610 Free Fire Diamonds",
    game: "FREE_FIRE_BD" as const,
    type: "DIAMONDS" as const,
    amount: 610,
    sellingPricePaisa: 51000, // Rs. 510.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} 610",
    sortOrder: 5,
    active: true,
  },
  {
    name: "1240 Diamonds",
    description: "1240 Free Fire Diamonds",
    game: "FREE_FIRE_BD" as const,
    type: "DIAMONDS" as const,
    amount: 1240,
    sellingPricePaisa: 102000, // Rs. 1,020.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} 1240",
    sortOrder: 6,
    active: true,
  },
  {
    name: "2530 Diamonds",
    description: "2530 Free Fire Diamonds",
    game: "FREE_FIRE_BD" as const,
    type: "DIAMONDS" as const,
    amount: 2530,
    sellingPricePaisa: 204000, // Rs. 2,040.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} 2530",
    sortOrder: 7,
    active: true,
  },
  {
    name: "Weekly Membership",
    description: "Free Fire Weekly Membership Subscription",
    game: "FREE_FIRE_BD" as const,
    type: "MEMBERSHIP" as const,
    amount: null,
    sellingPricePaisa: 20500, // Rs. 205.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} weekly",
    sortOrder: 8,
    active: true,
  },
  {
    name: "Monthly Membership",
    description: "Free Fire Monthly Membership Subscription",
    game: "FREE_FIRE_BD" as const,
    type: "MEMBERSHIP" as const,
    amount: null,
    sellingPricePaisa: 96000, // Rs. 960.00
    supplierCostPaisa: null,
    supplierCommand: "bduc {uid} monthly",
    sortOrder: 9,
    active: true,
  },
];

export async function seedProducts() {
  console.log("Seeding Free Fire Bangladesh initial catalogue...");

  for (const item of INITIAL_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: {
        game: item.game,
        name: item.name,
      },
    });

    if (!existing) {
      await prisma.product.create({
        data: item,
      });
      console.log(`Created product: ${item.name} (${item.sellingPricePaisa / 100} NPR)`);
    } else {
      console.log(`Product already exists: ${item.name}`);
    }
  }

  console.log("Product seeding complete! 🌱");
}

if (process.env.NODE_ENV !== "test") {
  seedProducts()
    .catch((err) => {
      console.error("Failed to seed products:", err);
      process.exit(1);
    });
}
