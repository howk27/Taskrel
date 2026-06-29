export function formatCurrency(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Numeric "MM/DD/YYYY" date (no time), UTC-fixed. */
export function formatDateNumeric(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
