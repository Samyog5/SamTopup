import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserOrderByNumber } from "@/server/services/order";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { orderNumber } = await params;
    const order = await getUserOrderByNumber(session.user.id, orderNumber);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Failed to fetch customer order detail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order detail" },
      { status: 500 }
    );
  }
}
