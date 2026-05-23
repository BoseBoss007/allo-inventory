"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Product, WarehouseStock } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface ReserveModalProps {
  product: Product;
  onClose: () => void;
}

export function ReserveModal({ product, onClose }: ReserveModalProps) {
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseStock | null>(
    product.warehouses.find((w) => w.availableUnits > 0) ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price;

  const maxQty = selectedWarehouse?.availableUnits ?? 0;

  const handleReserve = async () => {
    if (!selectedWarehouse || loading) return;
    setLoading(true);

    const idempotencyKey = uuidv4();

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          inventoryId: selectedWarehouse.inventoryId,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.error("⚡ " + (data.error ?? "Not enough stock — another customer just reserved those units."));
        onClose();
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? "Failed to create reservation");
        return;
      }

      toast.success(`Reserved ${quantity} unit${quantity > 1 ? "s" : ""} of ${product.name}!`);
      onClose();
      router.push(`/reservation/${data.reservation.id}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/50 p-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Reserve Units</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Held for 10 minutes while you complete checkout
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Product summary */}
          <div className="flex gap-3 rounded-xl bg-background/50 border border-border/40 p-3">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm leading-tight">{product.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>
              <p className="text-sm font-bold text-foreground mt-1">₹{price.toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* Warehouse selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Fulfillment Warehouse
            </label>
            <div className="space-y-2">
              {product.warehouses.map((w) => (
                <button
                  key={w.inventoryId}
                  onClick={() => {
                    if (w.availableUnits > 0) {
                      setSelectedWarehouse(w);
                      setQuantity(Math.min(quantity, w.availableUnits));
                    }
                  }}
                  disabled={w.availableUnits === 0}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                    selectedWarehouse?.inventoryId === w.inventoryId
                      ? "border-violet-500/60 bg-violet-500/10"
                      : w.availableUnits === 0
                      ? "border-border/30 opacity-50 cursor-not-allowed"
                      : "border-border/50 hover:border-border hover:bg-muted/20"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{w.warehouseName}</p>
                    <p className="text-xs text-muted-foreground">{w.warehouseLocation}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold ${
                        w.availableUnits === 0
                          ? "text-red-400"
                          : w.availableUnits <= 2
                          ? "text-orange-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {w.availableUnits === 0 ? "Out of stock" : `${w.availableUnits} available`}
                    </span>
                    {w.reservedUnits > 0 && (
                      <p className="text-xs text-muted-foreground/60">{w.reservedUnits} reserved</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity selector */}
          {selectedWarehouse && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="w-10 text-center text-lg font-bold text-foreground tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40"
                  disabled={quantity >= maxQty}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <span className="text-xs text-muted-foreground ml-1">
                  max {maxQty}
                </span>
              </div>
            </div>
          )}

          {/* Total */}
          {selectedWarehouse && (
            <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total to pay</span>
              <span className="text-xl font-bold text-foreground">
                ₹{(price * quantity).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 p-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border/60 bg-transparent px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleReserve}
            disabled={!selectedWarehouse || loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Reserving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Reserve Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
