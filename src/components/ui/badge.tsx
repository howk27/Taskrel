type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

const variants: Record<BadgeVariant, string> = {
  default:  "bg-slate-700 text-slate-300",
  success:  "bg-green-900/50 text-green-400",
  warning:  "bg-yellow-900/50 text-yellow-400",
  error:    "bg-red-900/50 text-red-400",
  info:     "bg-blue-900/50 text-blue-400",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
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
