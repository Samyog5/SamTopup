"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/config/constants";
import type { CustomerOrderDisplay } from "@/types";

export default function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  const [order, setOrder] = useState<CustomerOrderDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderNumber}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Order not found");
      } else {
        setOrder(json.data);
      }
    } catch {
      setError("Network error loading order detail");
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
        <Loading text="Loading order details..." />
      </div>
    );
  }

  if (error || !order) {
    return <ErrorDisplay message={error ?? "Order not found"} retry={fetchOrder} />;
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/orders"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-2" })}
        >
          ← Back to Orders
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
              Placed on {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" })}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Game Platform</span>
                <span className="font-semibold text-foreground">Free Fire Bangladesh</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Package Purchased</span>
                <span className="font-bold text-foreground text-base">{order.productNameSnapshot}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Free Fire Player UID</span>
                <span className="font-mono font-bold text-foreground text-base">{order.freeFireUid}</span>
              </div>
              {order.gamePlayerName ? (
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Free Fire Player Name</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{order.gamePlayerName}</span>
                </div>
              ) : order.status === "PROCESSING" ? (
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Player Name</span>
                  <span className="text-muted-foreground text-xs italic block mt-0.5">Player name will be available after successful top-up.</span>
                </div>
              ) : null}
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Payment Method</span>
                <span className="font-semibold text-foreground">SamTopup NPR Wallet</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex justify-between items-center">
              <span className="font-semibold text-muted-foreground">Total Price Paid:</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {order.priceFormatted}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Fulfillment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            {order.status === "REFUNDED" ? (
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-3 space-y-1">
                <span className="font-bold text-purple-700 dark:text-purple-400 block text-xs">
                  Top-Up Refunded to Wallet
                </span>
                <p className="text-xs text-muted-foreground">
                  Top-up failed because the supplier could not fulfill the request. <strong className="text-foreground">{order.priceFormatted}</strong> has been refunded to your SamTopup wallet.
                </p>
              </div>
            ) : (
              <p>
                Your payment has been received and verified. The order is currently in <strong className="text-foreground">{order.status}</strong> state.
              </p>
            )}
            <p className="border-t border-border pt-2 text-[11px] italic">
              Automated reseller integration deliver status for Free Fire UID: <span className="font-mono text-foreground font-bold">{order.freeFireUid}</span>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Event Timeline */}
      {order.events && order.events.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Order Activity Log</CardTitle>
            <CardDescription>Immutable record of order state updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border-l border-border ml-3 space-y-6 py-2">
              {order.events.map((evt) => (
                <div key={evt.id} className="relative pl-6">
                  <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-background" />
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Badge variant="outline" className={ORDER_STATUS_COLORS[evt.toStatus]}>
                      {evt.toStatus}
                    </Badge>
                  </div>
                  {evt.note && <p className="mt-1 text-xs text-muted-foreground">{evt.note}</p>}
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    {new Date(evt.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
