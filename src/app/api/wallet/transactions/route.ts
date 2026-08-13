import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getWalletTransactions } from "@/server/services/wallet";
import { walletPaginationSchema } from "@/lib/validation";

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
    const parsed = walletPaginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const { page, limit } = parsed.data;
    const result = await getWalletTransactions(session.user.id, page, limit);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to fetch wallet transactions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch wallet transactions" },
      { status: 500 }
    );
  }
}
