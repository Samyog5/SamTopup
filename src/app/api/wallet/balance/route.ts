import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWalletBalance } from "@/server/services/wallet";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const balance = await getWalletBalance(session.user.id);
    return NextResponse.json({ success: true, data: balance });
  } catch (error) {
    console.error("Failed to fetch wallet balance:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch wallet balance" },
      { status: 500 }
    );
  }
}
