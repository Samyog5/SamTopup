import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getAllProductsForAdmin, createProduct } from "@/server/services/product";
import { productSchema, productFilterSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = productFilterSchema.safeParse({
      game: searchParams.get("game") ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "true" ? true : undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const products = await getAllProductsForAdmin(parsed.success ? parsed.data : undefined);
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Failed to fetch admin products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    const created = await createProduct(parsed.data);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
