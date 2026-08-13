import { describe, it, expect } from "vitest";
import {
  createProduct,
  getActiveCustomerProducts,
  getAllProductsForAdmin,
  toggleProductActive,
} from "@/server/services/product";
import { supplierCommandSchema } from "@/lib/validation";
import { prisma } from "@/lib/db/prisma";

describe("Supplier Command Template Validation", () => {
  it("accepts valid command templates containing {uid}", () => {
    expect(supplierCommandSchema.safeParse("bduc {uid} 25").success).toBe(true);
    expect(supplierCommandSchema.safeParse("bduc {uid} 115").success).toBe(true);
    expect(supplierCommandSchema.safeParse("bduc {uid} weekly").success).toBe(true);
    expect(supplierCommandSchema.safeParse("bduc {uid} monthly").success).toBe(true);
  });

  it("rejects command templates missing the {uid} placeholder", () => {
    expect(supplierCommandSchema.safeParse("bduc 115").success).toBe(false);
    expect(supplierCommandSchema.safeParse("bduc user 115").success).toBe(false);
  });
});

describe("Product Catalogue Seed Integrity", () => {
  it("verifies all 9 initial Free Fire Bangladesh packages exist in the database", async () => {
    const products = await getActiveCustomerProducts("FREE_FIRE_BD");
    expect(products.length).toBeGreaterThanOrEqual(9);

    const names = products.map((p) => p.name);
    expect(names).toContain("25 Diamonds");
    expect(names).toContain("50 Diamonds");
    expect(names).toContain("115 Diamonds");
    expect(names).toContain("240 Diamonds");
    expect(names).toContain("610 Diamonds");
    expect(names).toContain("1240 Diamonds");
    expect(names).toContain("2530 Diamonds");
    expect(names).toContain("Weekly Membership");
    expect(names).toContain("Monthly Membership");
  });

  it("verifies 115 Diamonds package details & price", async () => {
    const products = await getActiveCustomerProducts("FREE_FIRE_BD");
    const p115 = products.find((p) => p.name === "115 Diamonds");

    expect(p115).toBeDefined();
    expect(p115?.sellingPricePaisa).toBe(10500); // Rs. 105.00
    expect(p115?.priceFormatted).toBe("Rs. 105.00");
    expect(p115?.amount).toBe(115);
    expect(p115?.type).toBe("DIAMONDS");
  });
});

describe("Product Service Operations", () => {
  it("creates a new product and converts NPR to paisa", async () => {
    const created = await createProduct({
      name: "Test 10 Diamonds",
      description: "Test package",
      game: "FREE_FIRE_BD",
      type: "DIAMONDS",
      amount: 10,
      sellingPriceRupees: 15,
      supplierCostRupees: 10,
      supplierCommand: "bduc {uid} 10",
      sortOrder: 99,
      active: true,
    });

    expect(created.sellingPricePaisa).toBe(1500);
    expect(created.supplierCostPaisa).toBe(1000);
    expect(created.profitPaisa).toBe(500); // 1500 - 1000 = 500 paisa (Rs. 5.00)
    expect(created.profitFormatted).toBe("Rs. 5.00");

    // Cleanup
    await prisma.product.delete({ where: { id: created.id } });
  });

  it("excludes inactive products from customer catalogue", async () => {
    const created = await createProduct({
      name: "Inactive Test Package",
      game: "FREE_FIRE_BD",
      type: "DIAMONDS",
      amount: 999,
      sellingPriceRupees: 100,
      supplierCommand: "bduc {uid} 999",
      sortOrder: 100,
      active: true,
    });

    // Deactivate product
    await toggleProductActive(created.id, false);

    // Verify product is present in Admin query
    const adminProducts = await getAllProductsForAdmin({ search: "Inactive Test Package" });
    expect(adminProducts.some((p) => p.id === created.id)).toBe(true);

    // Verify product is excluded from Customer query
    const customerProducts = await getActiveCustomerProducts("FREE_FIRE_BD");
    expect(customerProducts.some((p) => p.id === created.id)).toBe(false);

    // Cleanup
    await prisma.product.delete({ where: { id: created.id } });
  });
});
