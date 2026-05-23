"use client";

import type { Product } from "@/types";

interface Props {
  product: Product;
  onReserve: () => void;
}

export function ProductCard({ product, onReserve }: Props) {
  const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const totalAvailable = product.warehouses.reduce((sum, w) => sum + w.availableUnits, 0);
  const outOfStock = totalAvailable === 0;
  const lowStock = !outOfStock && totalAvailable <= 3;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1">
      <div className="relative h-52 overflow-hidden bg-background/50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-16 w-16 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        <div className="absolute top-3 right-3">
          {outOfStock && (
            <span className="rounded-full border border-red-500/30 bg-red-500/80 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
              Out of stock
            </span>
          )}
          {lowStock && (
            <span className="rounded-full border border-orange-500/30 bg-orange-500/80 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white animate-pulse">
              Only {totalAvailable} left!
            </span>
          )}
        </div>

        <div className="absolute top-3 left-3">
          <span className="rounded-md bg-background/80 backdrop-blur-sm border border-border/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            {product.sku}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-semibold text-base leading-snug group-hover:text-violet-300 transition-colors">
          {product.name}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 flex-1">{product.description}</p>

        <div className="mt-4 space-y-1.5">
          {product.warehouses.map((w) => (
            <div key={w.inventoryId} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {w.warehouseName}
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${
                  w.availableUnits === 0 ? "bg-red-500" : w.availableUnits <= 2 ? "bg-orange-400" : "bg-emerald-500"
                }`} />
                <span className={`font-medium ${
                  w.availableUnits === 0 ? "text-red-400" : w.availableUnits <= 2 ? "text-orange-400" : "text-emerald-400"
                }`}>
                  {w.availableUnits} avail.
                </span>
                {w.reservedUnits > 0 && (
                  <span className="text-muted-foreground/60">({w.reservedUnits} reserved)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-2xl font-bold">₹{price.toLocaleString("en-IN")}</span>
          <button
            onClick={onReserve}
            disabled={outOfStock}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              outOfStock
                ? "cursor-not-allowed bg-muted/30 text-muted-foreground"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 active:scale-95"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Reserve
          </button>
        </div>
      </div>
    </div>
  );
}
