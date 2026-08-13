import { prisma } from "@/lib/db/prisma";
import { formatNPR, rupeesToPaisa } from "@/lib/money";
import type { GameCode, ProductType } from "@/generated/prisma/client";
import type { ProductAdminDisplay, ProductCustomerDisplay } from "@/types";
import type { ProductInput } from "@/lib/validation";

// ─── Customer Services ───────────────────────────────────────────────────────

/**
 * Fetch active products for customer display.
 * Sanitizes supplier commands, supplier costs, and internal profit details.
 */
export async function getActiveCustomerProducts(
  game: GameCode = "FREE_FIRE_BD"
): Promise<ProductCustomerDisplay[]> {
  const products = await prisma.product.findMany({
    where: {
      game,
      active: true,
    },
    orderBy: [
      { sortOrder: "asc" },
      { sellingPricePaisa: "asc" },
    ],
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    game: p.game,
    type: p.type,
    amount: p.amount,
    sellingPricePaisa: p.sellingPricePaisa,
    priceFormatted: formatNPR(p.sellingPricePaisa),
    active: p.active,
    sortOrder: p.sortOrder,
  }));
}

/**
 * Fetch a single product by ID (sanitized for customer use).
 */
export async function getCustomerProductById(
  id: string
): Promise<ProductCustomerDisplay | null> {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product || !product.active) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    game: product.game,
    type: product.type,
    amount: product.amount,
    sellingPricePaisa: product.sellingPricePaisa,
    priceFormatted: formatNPR(product.sellingPricePaisa),
    active: product.active,
    sortOrder: product.sortOrder,
  };
}

// ─── Admin Services ──────────────────────────────────────────────────────────

/**
 * Fetch all products for admin management (includes supplier cost, command, and profit margin).
 */
export async function getAllProductsForAdmin(options?: {
  search?: string;
  activeOnly?: boolean;
  game?: GameCode;
}): Promise<ProductAdminDisplay[]> {
  const search = options?.search?.trim();

  const where: Record<string, unknown> = {};

  if (options?.game) {
    where.game = options.game;
  }

  if (options?.activeOnly) {
    where.active = true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { supplierCommand: { contains: search, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  return products.map((p) => {
    const profitPaisa =
      typeof p.supplierCostPaisa === "number"
        ? p.sellingPricePaisa - p.supplierCostPaisa
        : null;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      game: p.game,
      type: p.type,
      amount: p.amount,
      sellingPricePaisa: p.sellingPricePaisa,
      priceFormatted: formatNPR(p.sellingPricePaisa),
      supplierCostPaisa: p.supplierCostPaisa,
      costFormatted: p.supplierCostPaisa !== null ? formatNPR(p.supplierCostPaisa) : null,
      supplierCommand: p.supplierCommand,
      profitPaisa,
      profitFormatted: profitPaisa !== null ? formatNPR(profitPaisa) : null,
      active: p.active,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });
}

/**
 * Get product by ID for admin modification.
 */
export async function getAdminProductById(
  id: string
): Promise<ProductAdminDisplay | null> {
  const p = await prisma.product.findUnique({
    where: { id },
  });

  if (!p) return null;

  const profitPaisa =
    typeof p.supplierCostPaisa === "number"
      ? p.sellingPricePaisa - p.supplierCostPaisa
      : null;

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    game: p.game,
    type: p.type,
    amount: p.amount,
    sellingPricePaisa: p.sellingPricePaisa,
    priceFormatted: formatNPR(p.sellingPricePaisa),
    supplierCostPaisa: p.supplierCostPaisa,
    costFormatted: p.supplierCostPaisa !== null ? formatNPR(p.supplierCostPaisa) : null,
    supplierCommand: p.supplierCommand,
    profitPaisa,
    profitFormatted: profitPaisa !== null ? formatNPR(profitPaisa) : null,
    active: p.active,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * Create a new product.
 */
export async function createProduct(input: ProductInput): Promise<ProductAdminDisplay> {
  if (!input.supplierCommand.includes("{uid}")) {
    throw new Error("Supplier command template must contain the {uid} placeholder.");
  }

  const sellingPricePaisa = rupeesToPaisa(input.sellingPriceRupees);
  const supplierCostPaisa =
    typeof input.supplierCostRupees === "number" && input.supplierCostRupees >= 0
      ? rupeesToPaisa(input.supplierCostRupees)
      : null;

  const created = await prisma.product.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      game: input.game,
      type: input.type as ProductType,
      amount: input.type === "DIAMONDS" ? input.amount ?? null : null,
      sellingPricePaisa,
      supplierCostPaisa,
      supplierCommand: input.supplierCommand.trim(),
      sortOrder: input.sortOrder,
      active: input.active,
    },
  });

  const adminDisplay = await getAdminProductById(created.id);
  if (!adminDisplay) throw new Error("Failed to load created product");
  return adminDisplay;
}

/**
 * Update an existing product.
 */
export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<ProductAdminDisplay> {
  if (!input.supplierCommand.includes("{uid}")) {
    throw new Error("Supplier command template must contain the {uid} placeholder.");
  }

  const sellingPricePaisa = rupeesToPaisa(input.sellingPriceRupees);
  const supplierCostPaisa =
    typeof input.supplierCostRupees === "number" && input.supplierCostRupees >= 0
      ? rupeesToPaisa(input.supplierCostRupees)
      : null;

  await prisma.product.update({
    where: { id },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      game: input.game,
      type: input.type as ProductType,
      amount: input.type === "DIAMONDS" ? input.amount ?? null : null,
      sellingPricePaisa,
      supplierCostPaisa,
      supplierCommand: input.supplierCommand.trim(),
      sortOrder: input.sortOrder,
      active: input.active,
    },
  });

  const adminDisplay = await getAdminProductById(id);
  if (!adminDisplay) throw new Error("Product not found after update");
  return adminDisplay;
}

/**
 * Toggle product active / inactive status.
 */
export async function toggleProductActive(
  id: string,
  active: boolean
): Promise<ProductAdminDisplay> {
  await prisma.product.update({
    where: { id },
    data: { active },
  });

  const adminDisplay = await getAdminProductById(id);
  if (!adminDisplay) throw new Error("Product not found");
  return adminDisplay;
}
