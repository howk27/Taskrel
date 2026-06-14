type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

const variants: Record<BadgeVariant, string> = {
  default:  "bg-slate-700/70 text-slate-200 ring-1 ring-white/10",
  success:  "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-300/25",
  warning:  "bg-amber-400/14 text-amber-200 ring-1 ring-amber-300/25",
  error:    "bg-red-400/12 text-red-200 ring-1 ring-red-300/25",
  info:     "bg-sky-400/12 text-sky-200 ring-1 ring-sky-300/25",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${variants[variant]}`}>
      {children}
    </span>
  );
}

// Maps domain status strings to badge variants
export function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    draft: "default",
    sent: "info",
    approved: "success",
    rejected: "error",
    expired: "warning",
    paid: "success",
    overdue: "error",
    void: "default",
    scheduled: "info",
    in_progress: "warning",
    completed: "success",
    canceled: "error",
    active: "success",
    trialing: "info",
    past_due: "error",
    canceled_sub: "default",
  };
  return map[status] ?? "default";
}
