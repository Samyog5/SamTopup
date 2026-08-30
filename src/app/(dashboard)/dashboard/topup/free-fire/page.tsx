"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { AddMoneyModal } from "@/components/shared/add-money-modal";
import { GAMES, APP_NAME } from "@/config/constants";
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
  const [activeTab, setActiveTab] = useState<"ALL" | "DIAMONDS" | "MEMBERSHIP">("ALL");
  const [showUidGuide, setShowUidGuide] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paidOrder, setPaidOrder] = useState<CustomerOrderDisplay | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);

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

  async function handlePasteUid() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUidChange(text.trim());
        toast.success("Pasted UID from clipboard!");
      }
    } catch {
      toast.error("Unable to read clipboard");
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

  const filteredProducts =
    activeTab === "DIAMONDS"
      ? diamondPackages
      : activeTab === "MEMBERSHIP"
      ? membershipPackages
      : products;

  const userBalancePaisa = walletBalance?.balance ?? 0;
  const productPricePaisa = selectedProduct?.sellingPricePaisa ?? 0;
  const balanceAfterPaisa = userBalancePaisa - productPricePaisa;
  const hasSufficientBalance = userBalancePaisa >= productPricePaisa;

  return (
    <div className="space-y-8 pb-12">
      {/* Navigation & Hero Section */}
      <div className="space-y-4">
        <Link
          href="/dashboard/topup"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-2 text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Games Store
        </Link>

        {/* Hero Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-2xl sm:p-8">
          <div className="absolute right-0 top-0 h-full w-full sm:w-1/2 opacity-20 sm:opacity-35 pointer-events-none">
            <img
              src="/images/free-fire-banner.jpg"
              alt="Free Fire Bangladesh"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-500/50 shadow-xl bg-slate-900">
                <img
                  src="/images/free-fire-banner.jpg"
                  alt="Free Fire Logo"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white">
                    {GAMES.FREE_FIRE_BD.name}
                  </h1>
                  <Badge className="bg-emerald-500 text-white font-bold text-xs px-2.5 py-0.5 shadow-sm border-0">
                    ⚡ Instant Top-Up
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                  Enter Player UID, select diamonds or membership, and checkout instantly with your NPR wallet.
                </p>
              </div>
            </div>

            {/* Quick System Specs Pills */}
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 text-xs text-emerald-300 font-medium">
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Server: <strong className="text-white">Bangladesh (BD)</strong>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-teal-500/10 px-3 py-1.5 border border-teal-500/20 backdrop-blur-md">
                <svg className="h-3.5 w-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Currency: <strong className="text-white">NPR (Rs.) Wallet</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Topup Portal Layout */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column (8 cols): Step-by-Step Topup Form */}
        <div className="space-y-8 lg:col-span-8">
          {/* STEP 1: PLAYER UID INPUT CARD */}
          <Card className="border-border/60 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-600" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-500/20">
                    1
                  </div>
                  <div>
                    <CardTitle className="text-lg font-extrabold">Enter Player Information</CardTitle>
                    <CardDescription className="text-xs">
                      Enter your Free Fire Player Account UID
                    </CardDescription>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUidGuide(!showUidGuide)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {showUidGuide ? "Hide UID Guide" : "Where is UID?"}
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Expandable UID Guide */}
              {showUidGuide && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs space-y-2 text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>💡</span> How to find your Free Fire UID:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 leading-relaxed pl-1">
                    <li>Open Free Fire on your mobile device.</li>
                    <li>Tap your Profile Avatar / Name banner in the top-left corner.</li>
                    <li>Look under your avatar where it displays your 8-10 digit <strong>UID number</strong>.</li>
                    <li>Tap the copy icon next to your UID to copy it directly.</li>
                  </ol>
                </div>
              )}

              {/* UID Input Field */}
              <div className="space-y-2">
                <Label htmlFor="ff-player-uid" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Free Fire Player UID *</span>
                  {playerUid && !uidError && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      ✓ Valid UID Format
                    </span>
                  )}
                </Label>

                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-muted-foreground pointer-events-none">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>

                  <Input
                    id="ff-player-uid"
                    type="text"
                    placeholder="e.g. 3125514892"
                    value={playerUid}
                    onChange={(e) => handleUidChange(e.target.value)}
                    className={cn(
                      "pl-11 pr-24 h-12 text-base font-mono font-bold tracking-wide transition-all",
                      uidError
                        ? "border-destructive focus-visible:ring-destructive"
                        : playerUid && !uidError
                        ? "border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-500/5"
                        : ""
                    )}
                    required
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePasteUid}
                    className="absolute right-2 text-xs font-semibold text-muted-foreground hover:text-foreground h-8 px-2.5"
                  >
                    Paste
                  </Button>
                </div>

                {uidError ? (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1">
                    <span>⚠️</span> {uidError}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Diamonds will be credited directly to this Free Fire Player UID. Double-check before paying.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: CATALOGUE SELECTION */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-500/20">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">Select Top-Up Package</h2>
                  <p className="text-xs text-muted-foreground">Choose your desired diamond bundle or membership pass</p>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex rounded-xl bg-muted/60 p-1 border border-border/50 text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 transition-all",
                    activeTab === "ALL"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Packages ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("DIAMONDS")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 transition-all flex items-center gap-1",
                    activeTab === "DIAMONDS"
                      ? "bg-emerald-500 text-white shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  💎 Diamonds ({diamondPackages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("MEMBERSHIP")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 transition-all flex items-center gap-1",
                    activeTab === "MEMBERSHIP"
                      ? "bg-purple-600 text-white shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  👑 Passes ({membershipPackages.length})
                </button>
              </div>
            </div>

            {/* Packages Grid */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((pkg) => {
                const isSelected = selectedProduct?.id === pkg.id;
                const isMembership = pkg.type === "MEMBERSHIP";

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedProduct(pkg)}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
                      isSelected
                        ? isMembership
                          ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10"
                          : "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                        : "border-border/60 bg-card hover:border-emerald-500/40 hover:shadow-md"
                    )}
                  >
                    {/* Top Row: Icon & Selection Badge */}
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl p-2 font-bold text-xl shadow-sm border transition-transform group-hover:scale-110",
                          isMembership
                            ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        )}
                      >
                        {isMembership ? "👑" : "💎"}
                      </div>

                      {isSelected ? (
                        <Badge
                          className={cn(
                            "text-white text-[11px] font-extrabold px-2.5 py-0.5 shadow-sm border-0 flex items-center gap-1",
                            isMembership ? "bg-purple-600" : "bg-emerald-500"
                          )}
                        >
                          ✓ Selected
                        </Badge>
                      ) : (pkg.amount ?? 0) >= 500 ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold">
                          🔥 Best Value
                        </Badge>
                      ) : null}
                    </div>

                    {/* Content Row: Package Name & Price */}
                    <div className="mt-4 space-y-1">
                      <div className="font-extrabold text-base tracking-tight group-hover:text-foreground">
                        {pkg.name}
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <span
                          className={cn(
                            "text-lg font-black tracking-tight",
                            isMembership
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {pkg.priceFormatted}
                        </span>

                        <span className="text-[11px] text-muted-foreground font-medium">
                          NPR Wallet
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Checkout Summary Sidebar */}
        <div className="space-y-6 lg:col-span-4 lg:sticky lg:top-20">
          <Card className="border-border/60 shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />

            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  3
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold">Order Summary</CardTitle>
                  <CardDescription className="text-xs">Review before NPR wallet checkout</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Selected Product Card Summary */}
              {selectedProduct ? (
                <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 space-y-2">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Selected Package:
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{selectedProduct.type === "MEMBERSHIP" ? "👑" : "💎"}</span>
                      <div>
                        <div className="font-extrabold text-base text-foreground leading-tight">
                          {selectedProduct.name}
                        </div>
                        <div className="text-xs text-muted-foreground">Free Fire Bangladesh</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {selectedProduct.priceFormatted}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground text-center">
                  Select a package from the left catalogue
                </div>
              )}

              {/* Account UID Confirmation Box */}
              <div className="rounded-xl bg-muted/60 p-3 space-y-1.5 border border-border/50 text-xs">
                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>Target Player UID:</span>
                  <span className="font-mono font-bold text-foreground select-all">
                    {playerUid || "Not Entered"}
                  </span>
                </div>
              </div>

              {/* Wallet Balance Status Card */}
              <div className="rounded-xl border border-border/80 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="font-medium">NPR Wallet Balance:</span>
                  <span className="font-bold text-foreground text-sm">
                    {walletBalance?.formatted ?? formatNPR(0)}
                  </span>
                </div>

                {selectedProduct && (
                  <div className="flex justify-between items-center border-t border-border/50 pt-2 text-xs">
                    <span className="text-muted-foreground font-medium">Balance After Payment:</span>
                    <span
                      className={cn(
                        "font-extrabold",
                        balanceAfterPaisa >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      )}
                    >
                      {formatNPR(balanceAfterPaisa)}
                    </span>
                  </div>
                )}

                {!hasSufficientBalance && selectedProduct && (
                  <div className="rounded-lg bg-destructive/10 p-2.5 text-[11px] text-destructive font-semibold leading-relaxed border border-destructive/20 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1 font-bold">
                      <span>⚠️</span> Insufficient Wallet Balance
                    </div>
                    <p className="text-[11px] font-normal">
                      You need <strong>{formatNPR(productPricePaisa - userBalancePaisa)}</strong> more in your wallet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddMoneyOpen(true)}
                      className="text-xs font-bold underline hover:text-destructive/80 transition-colors text-left"
                    >
                      + Add Money via WhatsApp →
                    </button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                <div className="flex justify-between">
                  <span>Package Subtotal</span>
                  <span>{selectedProduct?.priceFormatted ?? formatNPR(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service & Processing Fee</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE (Rs. 0.00)</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-foreground border-t border-border pt-2">
                  <span>Total Payable Amount</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                    {selectedProduct?.priceFormatted ?? formatNPR(0)}
                  </span>
                </div>
              </div>

              {/* Main Checkout CTA Button */}
              <Button
                type="button"
                onClick={handleOpenCheckout}
                disabled={!selectedProduct || !playerUid || !!uidError}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 font-extrabold text-base shadow-xl shadow-emerald-500/20 transition-all hover:shadow-2xl hover:shadow-emerald-500/30 disabled:opacity-50"
              >
                Pay & Top Up Now →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Wallet Checkout Confirmation Dialog */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              {paidOrder ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <span>✓</span> Payment Successful!
                </span>
              ) : (
                "Confirm Wallet Payment"
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {paidOrder
                ? `Order #${paidOrder.orderNumber} placed & sent for automated fulfillment.`
                : "Review details carefully before debiting your NPR wallet."}
            </DialogDescription>
          </DialogHeader>

          {!paidOrder ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border/60 bg-muted/50 p-4 space-y-3 text-xs">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground font-medium">Game Title:</span>
                  <span className="font-extrabold text-foreground">Free Fire Bangladesh</span>
                </div>

                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground font-medium">Selected Package:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    {selectedProduct?.name}
                  </span>
                </div>

                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground font-medium">Player UID:</span>
                  <span className="font-mono font-bold text-foreground text-sm select-all">
                    {playerUid}
                  </span>
                </div>

                <div className="flex justify-between border-b border-border/60 pb-2 text-sm font-black">
                  <span>Total Debit Amount:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {selectedProduct?.priceFormatted}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Current Wallet Balance:</span>
                  <span className="font-semibold text-foreground">{formatNPR(userBalancePaisa)}</span>
                </div>

                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground">Remaining Balance:</span>
                  <span className={balanceAfterPaisa >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                    {formatNPR(balanceAfterPaisa)}
                  </span>
                </div>
              </div>

              {!hasSufficientBalance && (
                <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-semibold border border-destructive/20">
                  Insufficient wallet balance. Please add funds to your wallet to proceed.
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
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold shadow-md hover:from-emerald-600 hover:to-teal-700"
                >
                  {isPaying ? "Processing Order..." : "Confirm & Pay Now"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white text-lg font-bold shadow-md">
                    ✓
                  </div>
                  <div>
                    <div className="font-extrabold text-foreground text-base">
                      Top-Up Order Dispatched!
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Order #{paidOrder.orderNumber}
                    </div>
                  </div>
                </div>

                <div className="text-xs space-y-2 border-t border-emerald-500/20 pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 font-bold">
                      {paidOrder.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Player UID:</span>
                    <span className="font-mono font-bold">{paidOrder.freeFireUid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-extrabold text-emerald-600">{paidOrder.priceFormatted}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-emerald-500/20 pt-2 leading-relaxed">
                  Your top-up request is now in <strong>PROCESSING</strong> state and will be delivered automatically.
                </p>
              </div>

              <DialogFooter className="mt-6 flex justify-between gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPaidOrder(null);
                    setIsCheckoutModalOpen(false);
                  }}
                >
                  Make Another Order
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsCheckoutModalOpen(false);
                    router.push(`/dashboard/orders/${paidOrder.orderNumber}`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  View Order Status →
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Render AddMoneyModal */}
      <AddMoneyModal
        isOpen={isAddMoneyOpen}
        onOpenChange={setIsAddMoneyOpen}
        initialAmount={
          selectedProduct && productPricePaisa > userBalancePaisa
            ? String(Math.ceil((productPricePaisa - userBalancePaisa) / 100))
            : "500"
        }
      />
    </div>
  );
}
