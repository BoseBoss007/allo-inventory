"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Reservation } from "@/types";
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

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Reservation not found");
        return;
      }
      const data = await res.json();
      setReservation(data.reservation);
    } catch {
      setError("Failed to load reservation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReservation();
    // Poll every 10s to detect auto-expiry from other tabs
    pollRef.current = setInterval(fetchReservation, 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchReservation]);

  const handleExpired = useCallback(() => {
    // Optimistically update UI when countdown hits zero
    setReservation((prev) =>
      prev ? { ...prev, status: "RELEASED" } : prev
    );
    toast.error("Your reservation has expired. The units have been released.");
  }, []);

  const handleConfirm = async () => {
    if (!reservation || actionLoading) return;
    setActionLoading("confirm");

    try {
      const idempotencyKey = `confirm-${reservation.id}`;
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const data = await res.json();

      if (res.status === 410) {
        toast.error("Reservation expired before payment could be confirmed.");
        setReservation((prev) => prev ? { ...prev, status: "RELEASED" } : prev);
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? "Failed to confirm reservation");
        return;
      }

      setReservation(data.reservation);
      toast.success("🎉 Purchase confirmed! Your order is on its way.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!reservation || actionLoading) return;
    setActionLoading("cancel");

    try {
      const idempotencyKey = `release-${reservation.id}`;
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to cancel reservation");
        return;
      }

      setReservation(data.reservation);
      toast.info("Reservation cancelled. Units have been returned to stock.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mb-4 mx-auto h-16 w-16 animate-pulse rounded-full bg-card" />
        <div className="h-8 animate-pulse rounded-lg bg-card mb-3" />
        <div className="h-4 animate-pulse rounded-lg bg-card/60 w-2/3 mx-auto" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mb-6 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Reservation Not Found</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const product = reservation.inventory.product;
  const warehouse = reservation.inventory.warehouse;
  const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const totalPrice = price * reservation.quantity;
  const isPending = reservation.status === "PENDING";
  const isExpired = isPending && new Date(reservation.expiresAt) < new Date();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
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
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Checkout</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Reservation #{reservation.id.slice(-8).toUpperCase()}
              </p>
            </div>
            <ReservationStatusBadge status={reservation.status} />
          </div>
        </div>

        {/* Product details */}
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
              <h2 className="font-semibold text-foreground text-lg leading-tight">{product.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{product.description}</p>
            </div>
          </div>

          {/* Order summary */}
          <div className="mt-6 rounded-xl bg-background/50 border border-border/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Order Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Unit price</span>
              <span className="text-foreground">₹{price.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span className="text-foreground">{reservation.quantity} unit{reservation.quantity !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fulfilment warehouse</span>
              <span className="text-foreground">{warehouse.name}</span>
            </div>
            <div className="border-t border-border/50 pt-3 flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-lg text-foreground">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Countdown timer — only for pending */}
          {isPending && !isExpired && (
            <div className="mt-6">
              <CountdownTimer expiresAt={reservation.expiresAt} onExpired={handleExpired} />
            </div>
          )}

          {/* Expired banner */}
          {(reservation.status === "RELEASED" || isExpired) && (
            <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex gap-3 items-start">
              <svg className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-300">
                  {reservation.status === "RELEASED" ? "Reservation Released" : "Reservation Expired"}
                </p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  The held units have been returned to available stock.
                </p>
              </div>
            </div>
          )}

          {/* Confirmed banner */}
          {reservation.status === "CONFIRMED" && (
            <div className="mt-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex gap-3 items-start">
              <svg className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-emerald-300">Purchase Confirmed!</p>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  Your order will be dispatched from {warehouse.name}. Thank you for shopping with us!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && !isExpired && (
          <div className="border-t border-border/50 px-6 py-5 flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={!!actionLoading}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading === "confirm" ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Confirm Purchase
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={!!actionLoading}
              className="rounded-xl border border-border/60 bg-card px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading === "cancel" ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              Cancel
            </button>
          </div>
        )}

        {/* After terminal state */}
        {(reservation.status === "CONFIRMED" || reservation.status === "RELEASED") && (
          <div className="border-t border-border/50 px-6 py-5">
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-xl border border-border/60 bg-card px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all duration-200"
            >
              Browse More Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
