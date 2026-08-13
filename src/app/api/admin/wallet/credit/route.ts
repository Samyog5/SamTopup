import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { creditWallet } from "@/server/services/wallet";
import { adminCreditSchema } from "@/lib/validation";
import { rupeesToPaisa } from "@/lib/money";

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
    const parsed = adminCreditSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    const { userId, amountRupees, description, idempotencyKey } = parsed.data;
    const amountPaisa = rupeesToPaisa(amountRupees);

    if (amountPaisa <= 0) {
      return NextResponse.json(
        { success: false, error: "Credit amount must be greater than 0 NPR" },
        { status: 400 }
      );
    }

    const result = await creditWallet({
      userId,
      amountPaisa,
      description: description.trim(),
      reference: "ADMIN_CREDIT",
      idempotencyKey,
      adminId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Admin wallet credit failed:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
