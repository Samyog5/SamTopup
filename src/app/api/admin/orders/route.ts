import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getAdminOrders } from "@/server/services/order";
import { orderPaginationSchema } from "@/lib/validation";

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
    const parsed = orderPaginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const { page, limit, status, search } = parsed.success
      ? parsed.data
      : { page: 1, limit: 10, status: undefined, search: undefined };

    const result = await getAdminOrders({ page, limit, status, search });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to fetch admin orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin orders" },
      { status: 500 }
    );
  }
}
