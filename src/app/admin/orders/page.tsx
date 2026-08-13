"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/config/constants";
import type { AdminOrderDisplay, PaginatedResult } from "@/types";

export default function AdminOrdersPage() {
  const [ordersData, setOrdersData] = useState<PaginatedResult<AdminOrderDisplay> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to load admin orders");
      } else {
        setOrdersData(json.data);
      }
    } catch {
      setError("Network error loading admin orders");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Order Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor customer Free Fire top-up orders, UID submissions, selling prices, and supplier costs
          </p>
        </div>
      </div>

      {/* Filters & Data Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">
              All Platform Orders ({ordersData?.total ?? 0})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-64">
                <Input
                  type="search"
                  placeholder="Order #, UID, or email..."
                  value={search}
                  onChange={handleSearchChange}
                />
              </div>
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                className="rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
                <option value="MANUAL_REVIEW">Manual Review</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12">
              <Loading text="Loading admin order records..." />
            </div>
          ) : error ? (
            <ErrorDisplay message={error} retry={fetchOrders} />
          ) : ordersData?.items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No orders found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order Number</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Package</th>
                    <th className="px-4 py-3 font-semibold">Player UID</th>
                    <th className="px-4 py-3 font-semibold">Selling Price</th>
                    <th className="px-4 py-3 font-semibold">Supplier Cost</th>
                    <th className="px-4 py-3 font-semibold">Profit</th>
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
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{o.userName ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{o.userEmail}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {o.productNameSnapshot}
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground font-bold">
                        {o.freeFireUid}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {o.priceFormatted}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {o.costFormatted ?? <span className="text-xs italic">Not set</span>}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {o.profitFormatted ? (
                          <span
                            className={
                              (o.profitPaisa ?? 0) >= 0
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-red-600 dark:text-red-400 font-semibold"
                            }
                          >
                            {o.profitFormatted}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/orders/${o.orderNumber}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          View Details
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
