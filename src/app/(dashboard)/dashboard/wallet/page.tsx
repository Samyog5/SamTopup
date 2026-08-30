"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import { AddMoneyModal } from "@/components/shared/add-money-modal";
import { formatNPR } from "@/lib/money";
import type { WalletBalance, WalletTransactionDisplay, PaginatedResult } from "@/types";

export default function UserWalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<PaginatedResult<WalletTransactionDisplay> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);

  const fetchWalletData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [balanceRes, txRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch(`/api/wallet/transactions?page=${page}&limit=10`),
      ]);

      const balanceJson = await balanceRes.json();
      const txJson = await txRes.json();

      if (!balanceRes.ok || !balanceJson.success) {
        setError(balanceJson.error ?? "Failed to fetch wallet balance");
      } else if (!txRes.ok || !txJson.success) {
        setError(txJson.error ?? "Failed to fetch transactions");
      } else {
        setBalance(balanceJson.data);
        setTransactions(txJson.data);
      }
    } catch {
      setError("Network error loading wallet data");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  if (isLoading) {
    return (
      <div className="py-16">
        <Loading text="Loading your NPR wallet..." />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} retry={fetchWalletData} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Wallet</h1>
          <p className="text-sm text-muted-foreground">
            View your NPR wallet balance and transaction history
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsAddMoneyOpen(true)}
          className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-extrabold shadow-md flex items-center gap-2"
        >
          <span>💬</span> Add Money via WhatsApp
        </Button>
      </div>

      {/* Balance Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground">
              Current Available Balance
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {balance?.formatted ?? formatNPR(0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              All transactions are conducted strictly in Nepalese Rupees (NPR).
            </p>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddMoneyOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
            >
              + Add Balance
            </Button>
          </CardContent>
        </Card>

        {/* Informational Deposit Banner */}
        <Card className="border-border/50 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Wallet Funding Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Send your deposit amount and User ID directly to WhatsApp. Wallet balance is credited upon verification.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddMoneyOpen(true)}
              className="w-full text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            >
              Request WhatsApp Deposit →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Render AddMoneyModal */}
      <AddMoneyModal
        isOpen={isAddMoneyOpen}
        onOpenChange={setIsAddMoneyOpen}
      />

      {/* Transactions History */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Transaction History Ledger
          </CardTitle>
          <CardDescription>
            Every credit, debit, or refund is logged as an immutable transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No transactions recorded yet. Balance additions will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Balance After</th>
                    <th className="px-4 py-3 font-semibold">Description / Ref</th>
                    <th className="px-4 py-3 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.items.map((tx) => {
                    const isCredit = tx.type === "CREDIT" || tx.type === "REFUND";
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              isCredit
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200"
                                : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200"
                            }
                          >
                            {tx.type}
                          </Badge>
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            isCredit
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isCredit ? "+" : "-"} {formatNPR(tx.amount)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatNPR(tx.balanceAfter)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{tx.description ?? "Wallet Activity"}</div>
                          {tx.reference && (
                            <div className="text-xs text-muted-foreground">
                              Ref: {tx.reference}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {transactions && transactions.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">
                Page {transactions.page} of {transactions.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={transactions.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, transactions.totalPages))}
                  disabled={transactions.page >= transactions.totalPages}
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
