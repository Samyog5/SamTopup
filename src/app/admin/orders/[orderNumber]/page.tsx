"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/config/constants";
import type { AdminOrderDisplay } from "@/types";

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  const [order, setOrder] = useState<AdminOrderDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Order not found");
      } else {
        setOrder(json.data);
      }
    } catch {
      setError("Network error loading admin order detail");
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (isLoading) {
    return (
      <div className="py-16">
        <Loading text="Loading admin order details..." />
      </div>
    );
  }

  if (error || !order) {
    return <ErrorDisplay message={error ?? "Order not found"} retry={fetchOrder} />;
  }

  const calculatedCommand = order.supplierCommandSnapshot
    ? order.supplierCommandSnapshot.replace("{uid}", order.freeFireUid)
    : `bduc ${order.freeFireUid} ?`;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/orders"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-2" })}
        >
          ← Back to Admin Orders
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono tracking-tight sm:text-3xl">
                Order #{order.orderNumber}
              </h1>
              <Badge
                variant="outline"
                className={ORDER_STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}
              >
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Created on {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" })}
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Customer & Snapshot Details */}
        <div className="space-y-6 md:col-span-2">
          {/* Customer Info */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Customer Name</span>
                <span className="font-semibold text-foreground">{order.userName ?? "Unnamed User"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Customer Email</span>
                <span className="font-semibold text-foreground">{order.userEmail}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Internal User ID</span>
                <span className="font-mono text-xs text-muted-foreground">{order.userId}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Free Fire Player UID</span>
                <span className="font-mono font-bold text-foreground text-base">{order.freeFireUid}</span>
              </div>
              {order.gamePlayerName && (
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Free Fire Player Name</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{order.gamePlayerName}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Profit Margin Breakdown */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Financial & Margin Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-4 text-sm">
              <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20">
                <span className="text-xs text-muted-foreground block font-medium">Original Payment</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {order.priceFormatted}
                </span>
              </div>

              <div className="rounded-lg bg-muted p-3 border border-border">
                <span className="text-xs text-muted-foreground block font-medium">Supplier Cost (NPR)</span>
                <span className="text-lg font-bold text-foreground">
                  {order.costFormatted ?? "Not set"}
                </span>
              </div>

              <div className="rounded-lg bg-purple-500/10 p-3 border border-purple-500/20">
                <span className="text-xs text-muted-foreground block font-medium">Wallet Refund</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {order.status === "REFUNDED" ? order.priceFormatted : "Rs. 0.00"}
                </span>
              </div>

              <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/20">
                <span className="text-xs text-muted-foreground block font-medium">Calculated Profit</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {order.status === "REFUNDED" ? "Rs. 0.00" : (order.profitFormatted ?? "N/A")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Command Preview */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Supplier Command Template</CardTitle>
              <CardDescription>
                Reseller Telegram command generated from snapshot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-md bg-muted p-3 font-mono text-sm font-bold text-foreground flex items-center justify-between">
                <span>{calculatedCommand}</span>
                <Badge variant="outline" className="text-[10px] bg-background">
                  Template: {order.supplierCommandSnapshot}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                In Phase 5, this exact command string will be sent to the reseller Telegram group.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Metadata & Activity Log */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Order Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className={ORDER_STATUS_COLORS[order.status]}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Game:</span>
                <span className="font-semibold">{order.game}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Package Snapshot:</span>
                <span className="font-semibold">{order.productNameSnapshot}</span>
              </div>
              {order.idempotencyKey && (
                <div className="space-y-1 pt-1">
                  <span className="text-muted-foreground block">Idempotency Key:</span>
                  <span className="font-mono text-[10px] bg-muted px-2 py-1 rounded block truncate">
                    {order.idempotencyKey}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          {order.events && order.events.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Audit Event Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative border-l border-border ml-2 space-y-4 py-1 text-xs">
                  {order.events.map((evt) => (
                    <div key={evt.id} className="relative pl-5">
                      <div className="absolute -left-[4.5px] top-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Badge variant="outline" className={ORDER_STATUS_COLORS[evt.toStatus]}>
                          {evt.toStatus}
                        </Badge>
                      </div>
                      {evt.note && <p className="mt-1 text-muted-foreground">{evt.note}</p>}
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        {new Date(evt.createdAt).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
