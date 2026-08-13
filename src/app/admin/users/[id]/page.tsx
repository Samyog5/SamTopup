"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import { CreditWalletModal } from "@/components/admin/credit-wallet-modal";
import { formatNPR } from "@/lib/money";
import type { PaginatedResult, WalletTransactionDisplay, WalletBalance } from "@/types";

interface UserDetailData {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "ADMIN";
  };
  balance: WalletBalance;
  transactions: PaginatedResult<WalletTransactionDisplay>;
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<UserDetailData | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  const fetchUserDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${id}?page=${page}&limit=10`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to load user details");
      } else {
        setData(json.data);
      }
    } catch {
      setError("Network error loading user details");
    } finally {
      setIsLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

  if (isLoading) {
    return (
      <div className="py-16">
        <Loading text="Loading user wallet history..." />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorDisplay message={error ?? "User not found"} retry={fetchUserDetail} />;
  }

  const { user, balance, transactions } = data;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/users"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-2" })}
        >
          ← Back to Users
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {user.name ?? user.email}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button
            onClick={() => setIsCreditModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            + Add Balance
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {balance.formatted}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              User Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-sm font-semibold">
              {user.role}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ledger Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Transaction History Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No transactions recorded for this wallet yet.
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
                    <th className="px-4 py-3 font-semibold">Admin Audit</th>
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
                          <div className="font-medium">{tx.description ?? "N/A"}</div>
                          {tx.reference && (
                            <div className="text-xs text-muted-foreground">
                              Ref: {tx.reference}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {tx.adminEmail ? (
                            <div>
                              <span className="font-medium text-foreground">{tx.adminName ?? "Admin"}</span>
                              <div>{tx.adminEmail}</div>
                            </div>
                          ) : (
                            "System / User"
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
          {transactions.totalPages > 1 && (
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

      <CreditWalletModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          walletBalance: balance.balance,
          walletFormatted: balance.formatted,
        }}
        onSuccess={fetchUserDetail}
      />
    </div>
  );
}
