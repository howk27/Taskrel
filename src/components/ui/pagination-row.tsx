import Link from "next/link";

export type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  query?: string;
};

export function PaginationRow({ page, pageSize, total, basePath, query }: PaginationInfo) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const previousHref = paginationHref(basePath, page - 1, query);
  const nextHref = paginationHref(basePath, page + 1, query);

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--tr-text-muted)]">
        Showing <span className="font-semibold text-[var(--tr-text)]">{start}-{end}</span> of{" "}
        <span className="font-semibold text-[var(--tr-text)] tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={previousHref} className="inline-flex h-10 items-center rounded-lg border border-[var(--tr-border)] px-3 text-sm font-semibold text-[var(--tr-text)] transition-colors hover:bg-[var(--tr-surface-2)]">
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center rounded-lg border border-[var(--tr-border-soft)] px-3 text-sm font-semibold text-[var(--tr-text-faint)]">
            Previous
          </span>
        )}
        <span className="inline-flex h-10 items-center px-2 text-sm text-[var(--tr-text-muted)] tabular-nums">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={nextHref} className="tr-primary-action inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold">
            Next
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center rounded-lg border border-[var(--tr-border-soft)] px-3 text-sm font-semibold text-[var(--tr-text-faint)]">
            Next
          </span>
        )}
      </div>
    </div>
  );
}

function paginationHref(basePath: string, page: number, query?: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
