"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNPR, rupeesToPaisa } from "@/lib/money";

interface CreditWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string | null;
    email: string;
    walletBalance: number;
    walletFormatted: string;
  } | null;
  onSuccess: () => void;
}

export function CreditWalletModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: CreditWalletModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset & generate new idempotency key when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountInput("");
      setDescription("");
      setError(null);
      setIsConfirming(false);
      setIsLoading(false);
      setIdempotencyKey(`credit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    }
  }, [isOpen]);

  if (!user) return null;

  const parsedAmount = parseFloat(amountInput);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const creditPaisa = isValidAmount ? rupeesToPaisa(parsedAmount) : 0;
  const currentPaisa = user.walletBalance;
  const newPaisa = currentPaisa + creditPaisa;

  function handleProceedToConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidAmount) {
      setError("Please enter a valid credit amount greater than 0");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a reason / note for this wallet credit");
      return;
    }

    setIsConfirming(true);
  }

  async function handleFinalSubmit() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/wallet/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          amountRupees: parsedAmount,
          description: description.trim(),
          idempotencyKey,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error ?? "Failed to credit user wallet");
        setIsConfirming(false);
        return;
      }

      toast.success(
        `Successfully credited ${formatNPR(creditPaisa)} to ${user?.name ?? user?.email}`
      );
      onSuccess();
      onClose();
    } catch {
      setError("Network error occurred while submitting credit");
      setIsConfirming(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Credit User Wallet
          </DialogTitle>
          <DialogDescription>
            Manually add NPR wallet balance for{" "}
            <span className="font-medium text-foreground">
              {user.name ? `${user.name} (${user.email})` : user.email}
            </span>
            <br />
            User ID: <code className="font-mono text-xs font-bold text-foreground bg-muted px-1 rounded">{user.id}</code>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        {!isConfirming ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3 text-sm flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Current Balance:</span>
              <span className="text-base font-bold text-foreground">{user.walletFormatted}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount in NPR (Rs.)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">
                  Rs.
                </span>
                <Input
                  id="credit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="1000.00"
                  className="pl-11"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-reason">Reason / Note</Label>
              <Input
                id="credit-reason"
                type="text"
                placeholder="e.g. Bank transfer deposit ref #12345"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Review & Confirm
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
              <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Confirm Transaction Details
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous Balance:</span>
                  <span className="font-medium">{formatNPR(currentPaisa)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Credit Amount:</span>
                  <span>+ {formatNPR(creditPaisa)}</span>
                </div>
                <div className="border-t border-border pt-1 flex justify-between font-bold text-base">
                  <span>New Balance:</span>
                  <span>{formatNPR(newPaisa)}</span>
                </div>
                <div className="border-t border-border pt-1">
                  <span className="text-muted-foreground block text-xs">Reason/Note:</span>
                  <span className="text-sm font-medium">{description}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirming(false)}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading ? "Processing..." : "Confirm & Add Balance"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
