"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Product } from "@/types";
import { ProductCard } from "@/components/ProductCard";
import { ReserveModal } from "@/components/ReserveModal";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch {
      toast.error("Failed to load products. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    // Refresh stock every 30s
    const interval = setInterval(fetchProducts, 30_000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Race-condition safe inventory reservations
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Shop with{" "}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            confidence
          </span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Reserve your items for 10 minutes. Stock is held exclusively for you
          while you complete checkout.
        </p>
      </div>

      {/* Stats bar */}
      <div className="mb-10 grid grid-cols-3 gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{products.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Products</div>
        </div>
        <div className="text-center border-x border-border/50">
          <div className="text-2xl font-bold text-foreground">
            {[...new Set(products.flatMap(p => p.warehouses.map(w => w.warehouseId)))].length || 3}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Warehouses</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">Live</div>
          <div className="text-xs text-muted-foreground mt-1">Stock Updates</div>
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-96 animate-pulse rounded-2xl bg-card/50 border border-border/50"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 rounded-full bg-muted/20 p-6">
            <svg className="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">No products found</h2>
          <p className="mt-2 text-muted-foreground">
            The database may not be seeded yet. Run <code className="bg-muted px-1 rounded text-sm">npm run db:seed</code>
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onReserve={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}

      {/* Reserve modal */}
      {selectedProduct && (
        <ReserveModal
          product={selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            fetchProducts(); // refresh stock after reservation
          }}
        />
      )}
    </div>
  );
}
