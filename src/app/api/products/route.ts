import { NextResponse, type NextRequest } from "next/server";
import { getActiveCustomerProducts } from "@/server/services/product";
import type { GameCode } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = (searchParams.get("game") as GameCode) ?? "FREE_FIRE_BD";

    const products = await getActiveCustomerProducts(game);
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product catalogue" },
      { status: 500 }
    );
  }
}
