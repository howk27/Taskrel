type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--tr-badge-default-bg)] text-[var(--tr-badge-default-text)] ring-1 ring-[var(--tr-badge-default-ring)]",
  success: "bg-[var(--tr-badge-success-bg)] text-[var(--tr-badge-success-text)] ring-1 ring-[var(--tr-badge-success-ring)]",
  warning: "bg-[var(--tr-badge-warning-bg)] text-[var(--tr-badge-warning-text)] ring-1 ring-[var(--tr-badge-warning-ring)]",
  error: "bg-[var(--tr-badge-error-bg)] text-[var(--tr-badge-error-text)] ring-1 ring-[var(--tr-badge-error-ring)]",
  info: "bg-[var(--tr-badge-info-bg)] text-[var(--tr-badge-info-text)] ring-1 ring-[var(--tr-badge-info-ring)]",
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
