import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getAdminOrderByNumber } from "@/server/services/order";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { orderNumber } = await params;
    const order = await getAdminOrderByNumber(orderNumber);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Failed to fetch admin order detail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order detail" },
      { status: 500 }
    );
  }
}
