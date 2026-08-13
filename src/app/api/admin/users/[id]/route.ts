import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/server/services/user";
import { getWalletBalance, getWalletTransactions } from "@/server/services/wallet";
import { walletPaginationSchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = walletPaginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const page = parsed.success ? parsed.data.page : 1;
    const limit = parsed.success ? parsed.data.limit : 10;

    const [balance, transactions] = await Promise.all([
      getWalletBalance(user.id),
      getWalletTransactions(user.id, page, limit),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        user,
        balance,
        transactions,
      },
    });
  } catch (error) {
    console.error("Failed to fetch user wallet detail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user wallet detail" },
      { status: 500 }
    );
  }
}
