import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAndPayOrder, getUserOrders } from "@/server/services/order";
import { createOrderSchema, orderPaginationSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = orderPaginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const page = parsed.success ? parsed.data.page : 1;
    const limit = parsed.success ? parsed.data.limit : 10;

    const result = await getUserOrders(session.user.id, page, limit);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to fetch customer orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    const { productId, freeFireUid, idempotencyKey } = parsed.data;

    const result = await createAndPayOrder({
      userId: session.user.id,
      productId,
      freeFireUid,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error) {
    console.error("Order creation failed:", error);
    const message = error instanceof Error ? error.message : "Failed to process order";
    
    const status = message === "INSUFFICIENT_BALANCE" ? 400 : 500;
    return NextResponse.json(
      { success: false, error: message === "INSUFFICIENT_BALANCE" ? "Insufficient wallet balance to place this order." : message },
      { status }
    );
  }
}
