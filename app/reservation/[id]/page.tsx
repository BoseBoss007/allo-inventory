"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Reservation } from "@/types";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        setError((await res.json()).error ?? "Not found");
        return;
      }
      setReservation((await res.json()).reservation);
    } catch {
      setError("Failed to load reservation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch_();
    pollRef.current = setInterval(fetch_, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetch_]);

  const handleExpired = useCallback(() => {
    setReservation((prev) => prev ? { ...prev, status: "RELEASED" } : prev);
    toast.error("Reservation expired — units have been released.");
  }, []);

  const handleConfirm = async () => {
    if (!reservation || actionLoading) return;
    setActionLoading("confirm");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": `confirm-${reservation.id}` },
      });
      const data = await res.json();

      if (res.status === 410) {
        toast.error("Expired before we could confirm. Please reserve again.");
        setReservation((prev) => prev ? { ...prev, status: "RELEASED" } : prev);
        return;
      }
      if (!res.ok) { toast.error(data.error ?? "Confirm failed"); return; }

      setReservation(data.reservation);
      toast.success("Purchase confirmed! 🎉");
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!reservation || actionLoading) return;
    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
        headers: { "Idempotency-Key": `release-${reservation.id}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Cancel failed"); return; }
      setReservation(data.reservation);
      toast.info("Reservation cancelled. Units returned to stock.");
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-card rounded-lg w-1/2" />
          <div className="h-64 bg-card rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-xl font-semibold">Reservation not found</p>
        <p className="text-muted-foreground mt-2">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
        >
          Back to products
        </button>
      </div>
    );
  }

  const product = reservation.inventory.product;
  const warehouse = reservation.inventory.warehouse;
  const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const total = price * reservation.quantity;
  const isPending = reservation.status === "PENDING";
  const isExpiredNow = isPending && new Date(reservation.expiresAt) < new Date();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <button
        onClick={() => router.push("/")}
        className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to products
      </button>

      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="border-b border-border/50 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">Checkout</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                #{reservation.id.slice(-8).toUpperCase()}
              </p>
            </div>
            <ReservationStatusBadge status={reservation.status} />
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex gap-4">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-24 w-24 rounded-xl object-cover ring-1 ring-border/50 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg leading-tight">{product.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{product.description}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-background/50 border border-border/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold">Order Summary</h3>
            {[
              ["Unit price", `₹${price.toLocaleString("en-IN")}`],
              ["Quantity", `${reservation.quantity} unit${reservation.quantity !== 1 ? "s" : ""}`],
              ["Warehouse", warehouse.name],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span>{value}</span>
              </div>
            ))}
            <div className="border-t border-border/50 pt-3 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {isPending && !isExpiredNow && (
            <div className="mt-6">
              <CountdownTimer expiresAt={reservation.expiresAt} onExpired={handleExpired} />
            </div>
          )}

          {(reservation.status === "RELEASED" || isExpiredNow) && (
            <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex gap-3">
              <svg className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-300">Reservation Released</p>
                <p className="text-xs text-red-400/80 mt-0.5">Units returned to available stock.</p>
              </div>
            </div>
          )}

          {reservation.status === "CONFIRMED" && (
            <div className="mt-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex gap-3">
              <svg className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-emerald-300">Purchase Confirmed!</p>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  Dispatching from {warehouse.name}. Thanks for your order!
                </p>
              </div>
            </div>
          )}
        </div>

        {isPending && !isExpiredNow && (
          <div className="border-t border-border/50 px-6 py-5 flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={!!actionLoading}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading === "confirm" ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {actionLoading === "confirm" ? "Processing..." : "Confirm Purchase"}
            </button>
            <button
              onClick={handleCancel}
              disabled={!!actionLoading}
              className="rounded-xl border border-border/60 px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading === "cancel" ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : null}
              Cancel
            </button>
          </div>
        )}

        {(reservation.status === "CONFIRMED" || reservation.status === "RELEASED") && (
          <div className="border-t border-border/50 px-6 py-5">
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-xl border border-border/60 px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all"
            >
              Browse More Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
