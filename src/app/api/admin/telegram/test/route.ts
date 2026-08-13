import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTelegramConfig } from "@/server/providers/telegram/client";
import { parseSupplierResponse } from "@/server/providers/telegram/parser";
import { formatSupplierCommand } from "@/server/providers/telegram/formatter";
import { telegramProvider } from "@/server/providers/telegram/provider";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const config = getTelegramConfig();
    const isConfigured = !!config;

    const recentLogs = await prisma.providerLog.findMany({
      where: { providerType: "TELEGRAM" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        order: { select: { orderNumber: true, freeFireUid: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        configured: isConfigured,
        account: "@aslar55",
        targetGroup: config?.targetGroup ?? "SR2298 Nepal",
        apiIdConfigured: !!process.env.TELEGRAM_API_ID,
        sessionConfigured: !!process.env.TELEGRAM_SESSION,
        recentLogs,
      },
    });
  } catch (error) {
    console.error("Failed to fetch Telegram admin status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Telegram status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body.action ?? "PARSE_TEST";

    if (action === "PARSE_TEST") {
      const text = body.messageText ?? "";
      const parsed = parseSupplierResponse(text);
      return NextResponse.json({ success: true, data: parsed });
    }

    if (action === "FORMAT_TEST") {
      const template = body.template ?? "bduc {uid} 115";
      const uid = body.freeFireUid ?? "3125514892";
      const formatted = formatSupplierCommand(template, uid);
      return NextResponse.json({ success: true, data: { formatted } });
    }

    if (action === "SEND_DEV_TEST") {
      const config = getTelegramConfig();
      if (!config) {
        return NextResponse.json(
          {
            success: false,
            error: "Telegram credentials not configured in environment variables (TELEGRAM_API_ID / TELEGRAM_SESSION).",
          },
          { status: 400 }
        );
      }

      const result = await telegramProvider.sendTopup({
        orderId: "",
        gameUid: "3125514892",
        productSku: "bduc {uid} test",
        productName: "Developer Integration Test",
        quantity: 1,
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Telegram admin action failed:", error);
    const message = error instanceof Error ? error.message : "Failed to execute action";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
