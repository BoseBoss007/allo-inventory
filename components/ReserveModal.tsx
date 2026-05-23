"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import type { Product, WarehouseStock } from "@/types";

interface Props {
  product: Product;
  onClose: () => void;
}

export function ReserveModal({ product, onClose }: Props) {
  const router = useRouter();
  const [warehouse, setWarehouse] = useState<WarehouseStock | null>(
    product.warehouses.find((w) => w.availableUnits > 0) ?? null
  );
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const max = warehouse?.availableUnits ?? 0;

  const submit = async () => {
    if (!warehouse || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": uuid() },
        body: JSON.stringify({ inventoryId: warehouse.inventoryId, quantity: qty }),
      });
      const data = await res.json();

      if (res.status === 409) {
        toast.error(data.error ?? "Not enough stock — someone else just grabbed those units.");
        onClose();
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      toast.success(`Reserved ${qty} × ${product.name}`);
      onClose();
      router.push(`/reservation/${data.reservation.id}`);
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between border-b border-border/50 p-5">
          <div>
            <h2 className="text-lg font-bold">Reserve Units</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Held for 10 minutes while you pay</p>
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
          <div className="flex gap-3 rounded-xl bg-background/50 border border-border/40 p-3">
            {product.imageUrl && (
              <img src={product.imageUrl} alt={product.name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm leading-tight">{product.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>
              <p className="text-sm font-bold mt-1">₹{price.toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fulfillment Warehouse</label>
            <div className="space-y-2">
              {product.warehouses.map((w) => (
                <button
                  key={w.inventoryId}
                  onClick={() => {
                    if (w.availableUnits > 0) {
                      setWarehouse(w);
                      setQty(Math.min(qty, w.availableUnits));
                    }
                  }}
                  disabled={w.availableUnits === 0}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                    warehouse?.inventoryId === w.inventoryId
                      ? "border-violet-500/60 bg-violet-500/10"
                      : w.availableUnits === 0
                      ? "border-border/30 opacity-50 cursor-not-allowed"
                      : "border-border/50 hover:border-border hover:bg-muted/20"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{w.warehouseName}</p>
                    <p className="text-xs text-muted-foreground">{w.warehouseLocation}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${
                      w.availableUnits === 0 ? "text-red-400" : w.availableUnits <= 2 ? "text-orange-400" : "text-emerald-400"
                    }`}>
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

          {warehouse && (
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 hover:bg-muted/30 transition-colors disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="w-10 text-center text-lg font-bold tabular-nums">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(max, qty + 1))}
                  disabled={qty >= max}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 hover:bg-muted/30 transition-colors disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <span className="text-xs text-muted-foreground ml-1">max {max}</span>
              </div>
            </div>
          )}

          {warehouse && (
            <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold">₹{(price * qty).toLocaleString("en-IN")}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 p-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border/60 px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!warehouse || loading}
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
