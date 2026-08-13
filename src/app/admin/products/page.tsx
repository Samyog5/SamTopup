"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared/loading";
import { ErrorDisplay } from "@/components/shared/error-display";
import { ProductFormModal } from "@/components/admin/product-form-modal";
import type { ProductAdminDisplay } from "@/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductAdminDisplay[]>([]);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<ProductAdminDisplay | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (activeOnly) params.set("activeOnly", "true");

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to load products");
      } else {
        setProducts(json.data);
      }
    } catch {
      setError("Network error loading products");
    } finally {
      setIsLoading(false);
    }
  }, [search, activeOnly]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function handleCreateNew() {
    setSelectedProduct(null);
    setIsModalOpen(true);
  }

  function handleEditProduct(product: ProductAdminDisplay) {
    setSelectedProduct(product);
    setIsModalOpen(true);
  }

  async function handleToggleActive(product: ProductAdminDisplay) {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to toggle status");
        return;
      }

      toast.success(
        product.active
          ? `Deactivated product "${product.name}"`
          : `Activated product "${product.name}"`
      );

      fetchProducts();
    } catch {
      toast.error("Network error toggling status");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Product Catalogue Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage Free Fire Bangladesh products, NPR prices, supplier cost margins, and command templates
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          + Add New Product
        </Button>
      </div>

      {/* Filters & Table Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">
              Free Fire Bangladesh Packages ({products.length})
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-64">
                <Input
                  type="search"
                  placeholder="Search products or commands..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-emerald-600 focus:ring-emerald-500"
                />
                Active Only
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12">
              <Loading text="Loading product catalogue..." />
            </div>
          ) : error ? (
            <ErrorDisplay message={error} retry={fetchProducts} />
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No products found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Selling Price</th>
                    <th className="px-4 py-3 font-semibold">Supplier Cost</th>
                    <th className="px-4 py-3 font-semibold">Profit</th>
                    <th className="px-4 py-3 font-semibold">Command Template</th>
                    <th className="px-4 py-3 font-semibold text-center">Sort</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        !p.active ? "opacity-60 bg-muted/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.name}</div>
                        {p.amount !== null && (
                          <div className="text-xs text-muted-foreground">
                            {p.amount} Diamonds
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            p.type === "DIAMONDS"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200"
                              : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200"
                          }
                        >
                          {p.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {p.priceFormatted}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.costFormatted ?? <span className="text-xs italic">Not set</span>}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.profitFormatted ? (
                          <span
                            className={
                              (p.profitPaisa ?? 0) >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {p.profitFormatted}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground bg-muted/40 rounded px-2 py-1">
                        {p.supplierCommand}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {p.sortOrder}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className="focus:outline-none"
                          title="Click to toggle status"
                        >
                          <Badge
                            variant="outline"
                            className={
                              p.active
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 cursor-pointer"
                                : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 cursor-pointer"
                            }
                          >
                            {p.active ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(p)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(p)}
                            className={p.active ? "text-destructive hover:bg-destructive/10" : "text-emerald-600"}
                          >
                            {p.active ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />
    </div>
  );
}
