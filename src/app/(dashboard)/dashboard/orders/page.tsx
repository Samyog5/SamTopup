"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/config/constants";
import { cn } from "@/lib/utils";
import type { CustomerOrderDisplay, PaginatedResult } from "@/types";

export default function CustomerOrdersPage() {
  const [ordersData, setOrdersData] = useState<PaginatedResult<CustomerOrderDisplay> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders?page=${page}&limit=10`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to load orders");
      } else {
        setOrdersData(json.data);
      }
    } catch {
      setError("Network error loading orders");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Orders</h1>
        <p className="text-sm text-muted-foreground">
          Track your Free Fire Bangladesh top-up orders and fulfillment statuses
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Order History ({ordersData?.total ?? 0})
              </CardTitle>
              <CardDescription>
                All purchases paid using your SamTopup wallet
              </CardDescription>
            </div>
            <Link
              href="/dashboard/topup/free-fire"
              className={cn(buttonVariants({ size: "sm" }), "bg-emerald-600 hover:bg-emerald-700 text-white")}
            >
              + New Top Up
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12">
              <Loading text="Loading your orders..." />
            </div>
          ) : error ? (
            <ErrorDisplay message={error} retry={fetchOrders} />
          ) : ordersData?.items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground space-y-3">
              <p>No orders placed yet.</p>
              <Link
                href="/dashboard/topup/free-fire"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Browse Free Fire Catalogue →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order Number</th>
                    <th className="px-4 py-3 font-semibold">Package</th>
                    <th className="px-4 py-3 font-semibold">Player UID</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Date</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ordersData?.items.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {o.orderNumber}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {o.productNameSnapshot}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        <div>{o.freeFireUid}</div>
                        {o.gamePlayerName && (
                          <div className="text-[11px] font-sans font-semibold text-emerald-600 dark:text-emerald-400">
                            {o.gamePlayerName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {o.priceFormatted}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="outline"
                          className={ORDER_STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground"}
                        >
                          {ORDER_STATUS_LABELS[o.status] ?? o.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/orders/${o.orderNumber}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {ordersData && ordersData.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">
                Page {ordersData.page} of {ordersData.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={ordersData.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, ordersData.totalPages))}
                  disabled={ordersData.page >= ordersData.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
