import Link from "next/link";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getWalletBalance, getWalletTransactions } from "@/server/services/wallet";
import { getUserOrders } from "@/server/services/order";
import { formatNPR } from "@/lib/money";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/config/constants";
import { cn } from "@/lib/utils";
import type { CustomerOrderDisplay } from "@/types";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  let walletBalanceFormatted = formatNPR(0);
  let recentTxCount = 0;
  let recentOrders: CustomerOrderDisplay[] = [];

  if (user?.id) {
    const [balanceData, txData, ordersData] = await Promise.all([
      getWalletBalance(user.id),
      getWalletTransactions(user.id, 1, 5),
      getUserOrders(user.id, 1, 5),
    ]);
    walletBalanceFormatted = balanceData.formatted;
    recentTxCount = txData.total;
    recentOrders = ordersData.items;
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your Free Fire top-ups and NPR wallet
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/topup/free-fire"
            className={cn(
              buttonVariants(),
              "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            + Top Up Free Fire
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wallet Balance
            </CardTitle>
            <svg
              className="h-4 w-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {walletBalanceFormatted}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Available balance in NPR
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentTxCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ledger entries logged
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Account Information
            </CardTitle>
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200"
              >
                Active
              </Badge>
              <span className="text-xs capitalize text-muted-foreground font-medium">
                {user?.role?.toLowerCase() ?? "user"}
              </span>
            </div>

            <div className="space-y-1 pt-1 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-semibold text-foreground">User ID:</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                  {user?.id ?? "N/A"}
                </code>
              </div>
              <div className="text-muted-foreground truncate">
                <span className="font-semibold text-foreground">Email:</span> {user?.email}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
            <Link
              href="/dashboard/orders"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>No orders placed yet.</span>
                <Link
                  href="/dashboard/topup/free-fire"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Browse Free Fire Packages →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <div className="font-mono font-bold">{o.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.productNameSnapshot} • Free Fire UID: <span className="font-mono font-bold text-foreground">{o.freeFireUid}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {o.priceFormatted}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          ORDER_STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">My Wallet</CardTitle>
            <Link
              href="/dashboard/wallet"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">NPR Wallet Balance</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{walletBalanceFormatted}</span>
                </div>
                <Link
                  href="/dashboard/wallet"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                >
                  History
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                Balances are currently credited manually by platform administrators upon verification.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
