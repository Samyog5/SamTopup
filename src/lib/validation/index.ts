import { z } from "zod/v4";

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Game UID Schema ─────────────────────────────────────────────────────────

export const gameUidSchema = z.object({
  gameUid: z
    .string()
    .min(5, "Game UID must be at least 5 characters")
    .max(20, "Game UID is too long")
    .regex(/^\d+$/, "Game UID must contain only numbers"),
});

export type GameUidInput = z.infer<typeof gameUidSchema>;

// ─── Wallet Admin Schemas ───────────────────────────────────────────────────

export const adminCreditSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amountRupees: z.number().positive("Amount must be greater than 0"),
  description: z.string().min(1, "Reason / Note is required").max(500, "Reason is too long"),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
});

export type AdminCreditInput = z.infer<typeof adminCreditSchema>;

export const walletPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
});

export type WalletPaginationInput = z.infer<typeof walletPaginationSchema>;

// ─── Product Schemas ─────────────────────────────────────────────────────────

export const supplierCommandSchema = z
  .string()
  .min(3, "Supplier command template is too short")
  .max(200, "Supplier command template is too long")
  .refine((val) => val.includes("{uid}"), {
    message: "Supplier command template must contain the {uid} placeholder (e.g. 'bduc {uid} 115')",
  });

export const productSchema = z
  .object({
    name: z.string().min(2, "Product name must be at least 2 characters").max(100, "Name is too long"),
    description: z.string().max(500, "Description is too long").optional().nullable(),
    game: z.enum(["FREE_FIRE_BD"]).default("FREE_FIRE_BD"),
    type: z.enum(["DIAMONDS", "MEMBERSHIP"]),
    amount: z.coerce.number().int().positive("Diamond amount must be a positive integer").optional().nullable(),
    sellingPriceRupees: z.coerce.number().positive("Selling price must be greater than 0 NPR"),
    supplierCostRupees: z.coerce.number().min(0, "Supplier cost cannot be negative").optional().nullable(),
    supplierCommand: supplierCommandSchema,
    sortOrder: z.coerce.number().int().min(0, "Sort order must be non-negative").default(0),
    active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.type === "DIAMONDS") {
        return typeof data.amount === "number" && data.amount > 0;
      }
      return true;
    },
    {
      message: "Diamond amount is required for DIAMONDS product type",
      path: ["amount"],
    }
  );

export type ProductInput = z.infer<typeof productSchema>;

export const productFilterSchema = z.object({
  game: z.enum(["FREE_FIRE_BD"]).optional(),
  activeOnly: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type ProductFilterInput = z.infer<typeof productFilterSchema>;

// ─── Order Schemas ───────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  freeFireUid: z
    .string()
    .min(5, "Free Fire UID must be at least 5 digits")
    .max(20, "Free Fire UID is too long")
    .regex(/^\d+$/, "Free Fire UID must contain only digits"),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z
    .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED", "MANUAL_REVIEW"])
    .optional(),
  search: z.string().optional(),
});

export type OrderPaginationInput = z.infer<typeof orderPaginationSchema>;
