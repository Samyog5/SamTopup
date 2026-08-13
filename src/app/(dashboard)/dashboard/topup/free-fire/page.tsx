"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import { GAMES } from "@/config/constants";
import { gameUidSchema } from "@/lib/validation";
import { formatNPR } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductCustomerDisplay, WalletBalance, CustomerOrderDisplay } from "@/types";

export default function FreeFireTopupPage() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductCustomerDisplay[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductCustomerDisplay | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [playerUid, setPlayerUid] = useState("");
  const [uidError, setUidError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paidOrder, setPaidOrder] = useState<CustomerOrderDisplay | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [productsRes, walletRes] = await Promise.all([
        fetch("/api/products?game=FREE_FIRE_BD"),
        fetch("/api/wallet/balance"),
      ]);

      const productsJson = await productsRes.json();
      const walletJson = await walletRes.json();

      if (!productsRes.ok || !productsJson.success) {
        setError(productsJson.error ?? "Failed to load catalogue");
      } else {
        setProducts(productsJson.data);
        if (productsJson.data.length > 0) {
          const defaultProduct =
            productsJson.data.find((p: ProductCustomerDisplay) => p.name.includes("115")) ??
            productsJson.data[0];
          setSelectedProduct(defaultProduct);
        }
      }

      if (walletRes.ok && walletJson.success) {
        setWalletBalance(walletJson.data);
      }
    } catch {
      setError("Network error loading topup details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleUidChange(val: string) {
    const trimmed = val.trim();
    setPlayerUid(trimmed);

    if (trimmed.length > 0) {
      const parsed = gameUidSchema.safeParse({ gameUid: trimmed });
      if (!parsed.success) {
        setUidError(parsed.error.issues[0].message);
      } else {
        setUidError(null);
      }
    } else {
      setUidError(null);
    }
  }

  function handleOpenCheckout() {
    if (!selectedProduct) {
      toast.error("Please select a package first");
      return;
    }

    const parsed = gameUidSchema.safeParse({ gameUid: playerUid });
    if (!parsed.success) {
      setUidError(parsed.error.issues[0].message);
      return;
    }

    // Generate fresh idempotency key for this checkout attempt
    setIdempotencyKey(`order_pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    setIsCheckoutModalOpen(true);
  }

  async function handleConfirmPayment() {
    if (!selectedProduct) return;

    setIsPaying(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          freeFireUid: playerUid,
          idempotencyKey,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Payment failed");
        setIsPaying(false);
        return;
      }

      const order: CustomerOrderDisplay = json.data.order;
      setPaidOrder(order);
      toast.success(`Order ${order.orderNumber} successfully paid!`);

      // Refresh wallet balance after payment
      fetchData();
    } catch {
      toast.error("Network error processing payment");
    } finally {
      setIsPaying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="py-16">
        <Loading text="Loading Free Fire Bangladesh catalogue & wallet balance..." />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} retry={fetchData} />;
  }

  const diamondPackages = products.filter((p) => p.type === "DIAMONDS");
  const membershipPackages = products.filter((p) => p.type === "MEMBERSHIP");

  const userBalancePaisa = walletBalance?.balance ?? 0;
  const productPricePaisa = selectedProduct?.sellingPricePaisa ?? 0;
  const balanceAfterPaisa = userBalancePaisa - productPricePaisa;
  const hasSufficientBalance = userBalancePaisa >= productPricePaisa;

  return (
    <div className="space-y-8">
      {/* Header & Back link */}
      <div>
        <Link
          href="/dashboard/topup"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-3" })}
        >
          ← Back to Games
        </Link>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 text-white shadow-xl">
          <div className="absolute right-0 top-0 h-full w-1/2 sm:w-2/5 opacity-25 md:opacity-40">
            <img
              src="/images/free-fire-banner.jpg"
              alt="Free Fire Bangladesh"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-400/50 shadow-md bg-emerald-950">
              <img
                src="/images/free-fire-banner.jpg"
                alt="Free Fire Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-white">
                  {GAMES.FREE_FIRE_BD.name}
                </h1>
                <Badge className="bg-emerald-500 text-white font-semibold text-[10px] shadow-sm">
                  Instant Top-Up
                </Badge>
              </div>
              <p className="mt-1 text-sm text-emerald-100/80 max-w-xl">
                Select your package, enter your Free Fire UID, and pay instantly from your NPR wallet
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Catalogue Selection */}
        <div className="space-y-8 lg:col-span-2">
          {/* Diamond Packages */}
          {diamondPackages.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>💎</span> Diamond Packages
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {diamondPackages.map((pkg) => {
                  const isSelected = selectedProduct?.id === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedProduct(pkg)}
                      className={cn(
                        "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-md"
                          : "border-border/60 bg-card hover:border-emerald-500/40 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xl">💎</span>
                        {isSelected && (
                          <Badge className="bg-emerald-500 text-white text-[10px]">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="font-bold text-base">{pkg.name}</div>
                        <div className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {pkg.priceFormatted}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Memberships */}
          {membershipPackages.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>👑</span> Membership Subscriptions
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {membershipPackages.map((pkg) => {
                  const isSelected = selectedProduct?.id === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedProduct(pkg)}
                      className={cn(
                        "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30 shadow-md"
                          : "border-border/60 bg-card hover:border-purple-500/40 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xl">👑</span>
                        {isSelected && (
                          <Badge className="bg-purple-600 text-white text-[10px]">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="font-bold text-base">{pkg.name}</div>
                        <div className="mt-1 text-sm font-semibold text-purple-600 dark:text-purple-400">
                          {pkg.priceFormatted}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Player UID & Order Preparation Card */}
        <div className="space-y-6">
          <Card className="sticky top-20 border-border/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Order Preparation</CardTitle>
              <CardDescription>
                Confirm package & Player UID before wallet checkout
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Selected Package Details */}
              {selectedProduct ? (
                <div className="rounded-lg bg-muted p-3.5 space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">
                    Selected Package:
                  </div>
                  <div className="font-bold text-base flex justify-between items-center">
                    <span>{selectedProduct.name}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                      {selectedProduct.priceFormatted}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground text-center">
                  Please select a package from the catalogue
                </div>
              )}

              {/* Wallet Balance Summary */}
              <div className="rounded-lg border border-border p-3 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>Your Wallet Balance:</span>
                  <span className="text-foreground font-semibold">
                    {walletBalance?.formatted ?? formatNPR(0)}
                  </span>
                </div>
                {!hasSufficientBalance && selectedProduct && (
                  <div className="text-destructive font-semibold pt-1">
                    ⚠️ Insufficient wallet balance for this purchase.
                  </div>
                )}
              </div>

              {/* Free Fire UID Form */}
              <div className="space-y-2">
                <Label htmlFor="ff-uid">Free Fire Player UID *</Label>
                <Input
                  id="ff-uid"
                  type="text"
                  placeholder="e.g. 3125514892"
                  value={playerUid}
                  onChange={(e) => handleUidChange(e.target.value)}
                  required
                />
                {uidError ? (
                  <p className="text-xs text-destructive font-medium">{uidError}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Find your Player UID in your Free Fire in-game profile.
                  </p>
                )}
              </div>

              <Button
                type="button"
                onClick={handleOpenCheckout}
                disabled={!selectedProduct || !playerUid || !!uidError}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 font-semibold"
              >
                Review & Pay with Wallet →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Wallet Checkout Review Modal */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {paidOrder ? "Order Placed & Paid!" : "Confirm Wallet Payment"}
            </DialogTitle>
            <DialogDescription>
              {paidOrder
                ? `Order #${paidOrder.orderNumber} is now being processed.`
                : "Review order details before debiting your NPR wallet."}
            </DialogDescription>
          </DialogHeader>

          {!paidOrder ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted p-4 space-y-2.5 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Game:</span>
                  <span className="font-semibold text-foreground">Free Fire Bangladesh</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Package:</span>
                  <span className="font-bold text-foreground">{selectedProduct?.name}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Player UID:</span>
                  <span className="font-mono font-bold text-foreground">{playerUid}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400 border-b border-border pb-2">
                  <span>Price:</span>
                  <span>{selectedProduct?.priceFormatted}</span>
                </div>

                <div className="flex justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Current Wallet Balance:</span>
                  <span className="font-medium">{formatNPR(userBalancePaisa)}</span>
                </div>

                <div className="flex justify-between text-xs font-bold pt-0.5">
                  <span className="text-muted-foreground">Balance After Payment:</span>
                  <span className={balanceAfterPaisa >= 0 ? "text-foreground" : "text-destructive"}>
                    {formatNPR(balanceAfterPaisa)}
                  </span>
                </div>
              </div>

              {!hasSufficientBalance && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive font-semibold">
                  Insufficient wallet balance. Please contact an administrator to top up your wallet.
                </div>
              )}

              <DialogFooter className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  disabled={isPaying}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isPaying || !hasSufficientBalance}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isPaying ? "Processing Payment..." : "Confirm & Pay with Wallet"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                  <span>✓</span> Payment Successful
                </div>
                <div className="text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Number:</span>
                    <span className="font-mono font-bold">{paidOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200">
                      {paidOrder.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-bold text-emerald-600">{paidOrder.priceFormatted}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground border-t border-emerald-500/20 pt-2 leading-relaxed">
                  Your order is now in <strong>PROCESSING</strong> state. Fulfillment will occur as supplier signals arrive.
                </p>
              </div>

              <DialogFooter className="mt-6 flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPaidOrder(null);
                    setIsCheckoutModalOpen(false);
                  }}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsCheckoutModalOpen(false);
                    router.push(`/dashboard/orders/${paidOrder.orderNumber}`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  View Order Details →
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
