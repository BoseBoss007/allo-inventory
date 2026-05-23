"use client";

interface ReservationStatusBadgeProps {
  status: "PENDING" | "CONFIRMED" | "RELEASED";
}

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  const config = {
    PENDING: {
      label: "Pending",
      className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
      dot: "bg-yellow-400 animate-pulse",
    },
    CONFIRMED: {
      label: "Confirmed",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      dot: "bg-emerald-400",
    },
    RELEASED: {
      label: "Released",
      className: "border-red-500/30 bg-red-500/10 text-red-400",
      dot: "bg-red-400",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
