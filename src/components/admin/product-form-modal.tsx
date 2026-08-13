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
import { paisaToRupees } from "@/lib/money";
import type { ProductAdminDisplay } from "@/types";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductAdminDisplay | null;
  onSuccess: () => void;
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: ProductFormModalProps) {
  const isEditing = !!product;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"DIAMONDS" | "MEMBERSHIP">("DIAMONDS");
  const [amount, setAmount] = useState<string>("");
  const [sellingPriceRupees, setSellingPriceRupees] = useState("");
  const [supplierCostRupees, setSupplierCostRupees] = useState("");
  const [supplierCommand, setSupplierCommand] = useState("bduc {uid} ");
  const [sortOrder, setSortOrder] = useState("1");
  const [active, setActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);

      if (product) {
        setName(product.name);
        setDescription(product.description ?? "");
        setType(product.type);
        setAmount(product.amount !== null ? product.amount.toString() : "");
        setSellingPriceRupees((product.sellingPricePaisa / 100).toString());
        setSupplierCostRupees(
          product.supplierCostPaisa !== null
            ? (product.supplierCostPaisa / 100).toString()
            : ""
        );
        setSupplierCommand(product.supplierCommand);
        setSortOrder(product.sortOrder.toString());
        setActive(product.active);
      } else {
        setName("");
        setDescription("");
        setType("DIAMONDS");
        setAmount("");
        setSellingPriceRupees("");
        setSupplierCostRupees("");
        setSupplierCommand("bduc {uid} ");
        setSortOrder("1");
        setActive(true);
      }
    }
  }, [isOpen, product]);

  const hasUidPlaceholder = supplierCommand.includes("{uid}");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!hasUidPlaceholder) {
      setError("Supplier command template must include the {uid} placeholder.");
      return;
    }

    const priceNum = parseFloat(sellingPriceRupees);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid selling price greater than 0 NPR.");
      return;
    }

    if (type === "DIAMONDS") {
      const amtNum = parseInt(amount, 10);
      if (isNaN(amtNum) || amtNum <= 0) {
        setError("Diamond amount must be a positive integer for DIAMONDS product type.");
        return;
      }
    }

    const costNum = supplierCostRupees.trim() !== "" ? parseFloat(supplierCostRupees) : null;
    if (costNum !== null && (isNaN(costNum) || costNum < 0)) {
      setError("Supplier cost must be a non-negative number.");
      return;
    }

    const orderNum = parseInt(sortOrder, 10);

    setIsLoading(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        game: "FREE_FIRE_BD",
        type,
        amount: type === "DIAMONDS" ? parseInt(amount, 10) : null,
        sellingPriceRupees: priceNum,
        supplierCostRupees: costNum,
        supplierCommand: supplierCommand.trim(),
        sortOrder: isNaN(orderNum) ? 0 : orderNum,
        active,
      };

      const url = isEditing
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products";

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to save product");
        return;
      }

      toast.success(
        isEditing
          ? `Product "${name}" updated successfully`
          : `Product "${name}" created successfully`
      );

      onSuccess();
      onClose();
    } catch {
      setError("Network error occurred while saving product");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? "Edit Product" : "Add New Free Fire Product"}
          </DialogTitle>
          <DialogDescription>
            Configure catalogue details, NPR pricing, and Telegram supplier command templates.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Game Selection (Fixed) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Game Platform</Label>
            <Input value="Free Fire Bangladesh (FREE_FIRE_BD)" disabled className="bg-muted" />
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name *</Label>
            <Input
              id="product-name"
              placeholder="e.g. 115 Diamonds"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="product-desc">Description (Optional)</Label>
            <Input
              id="product-desc"
              placeholder="e.g. Instant 115 Free Fire Diamonds top-up"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Type & Amount */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-type">Product Type *</Label>
              <select
                id="product-type"
                value={type}
                onChange={(e) => setType(e.target.value as "DIAMONDS" | "MEMBERSHIP")}
                disabled={isLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="DIAMONDS">Diamonds Package</option>
                <option value="MEMBERSHIP">Membership Subscription</option>
              </select>
            </div>

            {type === "DIAMONDS" && (
              <div className="space-y-2">
                <Label htmlFor="product-amount">Diamond Amount *</Label>
                <Input
                  id="product-amount"
                  type="number"
                  placeholder="115"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                  required={type === "DIAMONDS"}
                />
              </div>
            )}
          </div>

          {/* Pricing: Selling Price & Supplier Cost */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="selling-price">Selling Price (NPR) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium">
                  Rs.
                </span>
                <Input
                  id="selling-price"
                  type="number"
                  step="1"
                  min="1"
                  placeholder="105"
                  className="pl-9"
                  value={sellingPriceRupees}
                  onChange={(e) => setSellingPriceRupees(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-cost">Supplier Cost (NPR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium">
                  Rs.
                </span>
                <Input
                  id="supplier-cost"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Private cost (optional)"
                  className="pl-9"
                  value={supplierCostRupees}
                  onChange={(e) => setSupplierCostRupees(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Never shown to customers. Used for profit calculations.
              </span>
            </div>
          </div>

          {/* Supplier Command */}
          <div className="space-y-2">
            <Label htmlFor="supplier-command">Supplier Command Template *</Label>
            <Input
              id="supplier-command"
              placeholder="e.g. bduc {uid} 115"
              value={supplierCommand}
              onChange={(e) => setSupplierCommand(e.target.value)}
              disabled={isLoading}
              required
            />
            {!hasUidPlaceholder && (
              <p className="text-xs text-destructive font-medium">
                ⚠️ Warning: Command MUST contain the {"{uid}"} placeholder.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Example format: <code className="bg-muted px-1 py-0.5 rounded">bduc {"{uid}"} 115</code> or <code className="bg-muted px-1 py-0.5 rounded">bduc {"{uid}"} weekly</code>
            </p>
          </div>

          {/* Sort Order & Active */}
          <div className="grid gap-4 sm:grid-cols-2 items-center">
            <div className="space-y-2">
              <Label htmlFor="sort-order">Sort Order</Label>
              <Input
                id="sort-order"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                id="product-active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-input text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="product-active" className="cursor-pointer">
                Active in Customer Catalogue
              </Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !hasUidPlaceholder}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading
                ? "Saving..."
                : isEditing
                ? "Update Product"
                : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
