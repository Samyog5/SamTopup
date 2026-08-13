import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatNPR } from "@/lib/money";
import { cn } from "@/lib/utils";

export default async function AdminPage() {
  const [
    totalUsers,
    totalWalletAgg,
    totalOrders,
    processingOrders,
    completedOrdersCount,
    totalRevenueAgg,
    completedOrdersList,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.aggregate({
      _sum: { balance: true },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PROCESSING" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.aggregate({
      _sum: { sellingPricePaisa: true },
    }),
    prisma.order.findMany({
      where: { status: "COMPLETED" },
      select: { sellingPricePaisa: true, supplierCostPaisa: true },
    }),
  ]);

  const totalWalletPaisa = totalWalletAgg._sum.balance ?? 0;
  const totalRevenuePaisa = totalRevenueAgg._sum.sellingPricePaisa ?? 0;

  // Calculate Realized Net Profit & Supplier Costs from COMPLETED orders
  let completedRevenuePaisa = 0;
  let completedCostPaisa = 0;
  let totalProfitPaisa = 0;

  completedOrdersList.forEach((o) => {
    completedRevenuePaisa += o.sellingPricePaisa;
    if (typeof o.supplierCostPaisa === "number") {
      completedCostPaisa += o.supplierCostPaisa;
      totalProfitPaisa += o.sellingPricePaisa - o.supplierCostPaisa;
    }
  });

  const profitMarginPercent =
    completedRevenuePaisa > 0
      ? ((totalProfitPaisa / completedRevenuePaisa) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Platform overview, user wallets, product catalogue, profit analytics, and order management
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/users"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold"
            )}
          >
            Manage Users ({totalUsers})
          </Link>
          <Link
            href="/admin/orders"
            className={cn(
              buttonVariants(),
              "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            )}
          >
            Manage Orders →
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid (4 Columns) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              <strong className="text-foreground">{processingOrders}</strong> in PROCESSING state
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Order Volume (NPR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatNPR(totalRevenuePaisa)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Total NPR processed via wallet</p>
          </CardContent>
        </Card>

        {/* Profit Generated Stat Card */}
        <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 via-card to-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center justify-between">
              <span>Total Profit Generated</span>
              <span className="text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                {profitMarginPercent}% Margin
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {formatNPR(totalProfitPaisa)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Net margin from {completedOrdersCount} completed top-ups
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users & Balance
            </CardTitle>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Manage →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers} Users</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {formatNPR(totalWalletPaisa)} in user wallets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dedicated Profit & Revenue Analytics Breakdown Grid */}
      <Card className="border-border/50 bg-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>📈</span> Profit & Margin Analytics Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time financial performance calculated from verified supplier fulfillment margin snapshots
              </CardDescription>
            </div>
            <Link
              href="/admin/orders"
              className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs" })}
            >
              View Order Financials →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {/* Completed Revenue */}
            <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20">
              <span className="text-xs text-muted-foreground block font-medium">Completed Revenue</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">
                {formatNPR(completedRevenuePaisa)}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">
                Customer payments for completed orders
              </span>
            </div>

            {/* Total Supplier Cost */}
            <div className="rounded-xl bg-slate-500/10 p-4 border border-border">
              <span className="text-xs text-muted-foreground block font-medium">Total Supplier Cost</span>
              <span className="text-xl font-extrabold text-foreground block mt-1">
                {formatNPR(completedCostPaisa)}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">
                Cost paid to Telegram supplier
              </span>
            </div>

            {/* Net Realized Profit */}
            <div className="rounded-xl bg-blue-500/10 p-4 border border-blue-500/20">
              <span className="text-xs text-muted-foreground block font-medium">Net Realized Profit</span>
              <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 block mt-1">
                {formatNPR(totalProfitPaisa)}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">
                Revenue minus supplier cost
              </span>
            </div>

            {/* Overall Margin % */}
            <div className="rounded-xl bg-purple-500/10 p-4 border border-purple-500/20">
              <span className="text-xs text-muted-foreground block font-medium">Overall Profit Margin</span>
              <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400 block mt-1">
                {profitMarginPercent}%
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">
                Average net margin across completed top-ups
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Management Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">User & Wallet Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Search registered users by User ID, name, or email, view wallet balances, and manually credit funds.
            </p>
            <Link
              href="/admin/users"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Manage Users ({totalUsers}) →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Order Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              View customer top-up requests, Player UIDs, selling prices, supplier cost margins, and audit timelines.
            </p>
            <Link
              href="/admin/orders"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              View All Orders ({totalOrders}) →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Product Catalogue & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage Free Fire Bangladesh diamond packages, NPR prices, supplier cost margins, and command templates.
            </p>
            <Link
              href="/admin/products"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Manage Products →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
