"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WHATSAPP_NUMBER } from "@/config/constants";

interface AddMoneyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialAmount?: string;
}

export function AddMoneyModal({
  isOpen,
  onOpenChange,
  initialAmount = "500",
}: AddMoneyModalProps) {
  const { data: session } = useSession();
  const loggedInUserId = session?.user?.id ?? "";

  const [amount, setAmount] = useState(initialAmount);
  const [userId, setUserId] = useState(loggedInUserId);

  // Sync userId when session loads or modal opens
  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
    }
  }, [session?.user?.id, isOpen]);

  useEffect(() => {
    if (isOpen && initialAmount) {
      setAmount(initialAmount);
    }
  }, [isOpen, initialAmount]);

  const presetAmounts = ["100", "500", "1000", "2000", "5000"];

  const cleanedAmount = amount.trim();
  const cleanedUserId = userId.trim();

  // Exact required format: "I need to add money <amount> and my user id is <user id>"
  const formattedMessage = `I need to add money ${cleanedAmount || "<amount>"} and my user id is ${cleanedUserId || "<user id>"}`;

  function handleSendWhatsApp(e: React.FormEvent) {
    e.preventDefault();

    if (!cleanedAmount || isNaN(Number(cleanedAmount)) || Number(cleanedAmount) <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }

    if (!cleanedUserId) {
      toast.error("Please enter or verify your User ID");
      return;
    }

    // Clean phone number for wa.me link (remove +, spaces, hyphens)
    const cleanPhone = WHATSAPP_NUMBER.replace(/[\s\+\-]/g, "");
    const messageText = `I need to add money ${cleanedAmount} and my user id is ${cleanedUserId}`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    toast.success("Opening WhatsApp with your request...");
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/80 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              💬
            </span>
            Add Money to Wallet
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enter the amount to add to your SamTopup NPR wallet. We will redirect you to WhatsApp with your pre-filled details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSendWhatsApp} className="space-y-4 py-2">
          {/* Amount Input & Preset Chips */}
          <div className="space-y-2">
            <Label htmlFor="add-money-amount" className="text-xs font-bold uppercase tracking-wider">
              Amount in NPR (Rs.) *
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                Rs.
              </span>
              <Input
                id="add-money-amount"
                type="number"
                min="10"
                step="1"
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-11 h-11 text-base font-extrabold font-mono"
                required
              />
            </div>

            {/* Quick Preset Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                    amount === preset
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  Rs. {Number(preset).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* User ID Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="add-money-userid" className="text-xs font-bold uppercase tracking-wider">
                User ID *
              </Label>
              {loggedInUserId && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold">
                  ✓ Autofilled
                </Badge>
              )}
            </div>
            <Input
              id="add-money-userid"
              type="text"
              placeholder="e.g. user_id_or_email"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-10 text-xs font-mono font-medium"
              required
            />
            {!loggedInUserId && (
              <p className="text-[11px] text-muted-foreground">
                Sign in to automatically link your account User ID, or enter your registered account ID above.
              </p>
            )}
          </div>

          {/* Live Message Preview Box */}
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground font-semibold text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <span>💬</span> WhatsApp Message Preview
              </span>
              <span>Pre-formatted</span>
            </div>
            <div className="rounded-lg bg-background p-3 font-mono text-xs text-foreground border border-border/60 shadow-inner select-all break-all">
              {formattedMessage}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-extrabold shadow-md flex items-center gap-2"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              Send WhatsApp Request →
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
