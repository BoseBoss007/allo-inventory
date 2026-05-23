"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { ProductCard } from "@/components/ProductCard";
import { ReserveModal } from "@/components/ReserveModal";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error();
      setProducts(await res.json());
    } catch {
      toast.error("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    const id = setInterval(loadProducts, 30_000);
    return () => clearInterval(id);
  }, [loadProducts]);

  const warehouseCount = [...new Set(products.flatMap((p) => p.warehouses.map((w) => w.warehouseId)))].length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Race-condition safe reservations
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Shop with{" "}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            confidence
          </span>
        </h1>
        <p className="mt-4 mx-auto max-w-2xl text-lg text-muted-foreground">
          Reserve items for 10 minutes. Stock is held exclusively for you while you complete payment.
        </p>
      </div>

      <div className="mb-10 grid grid-cols-3 gap-4 rounded-2xl border border-border/50 bg-card/50 p-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{products.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Products</div>
        </div>
        <div className="text-center border-x border-border/50">
          <div className="text-2xl font-bold">{warehouseCount || 3}</div>
          <div className="text-xs text-muted-foreground mt-1">Warehouses</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">Live</div>
          <div className="text-xs text-muted-foreground mt-1">Stock Updates</div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl bg-card/50 border border-border/50" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-xl font-semibold">No products yet</p>
          <p className="mt-2 text-muted-foreground text-sm">
            Run <code className="bg-muted px-1 rounded">npm run db:seed</code> to populate the database.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onReserve={() => setSelected(p)} />
          ))}
        </div>
      )}

      {selected && (
        <ReserveModal
          product={selected}
          onClose={() => {
            setSelected(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}
