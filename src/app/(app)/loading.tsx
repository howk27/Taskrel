export default function AppLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--tr-surface-2)]" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-[var(--tr-surface-2)]" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-[var(--tr-surface)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="h-80 animate-pulse rounded-xl bg-[var(--tr-surface)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]" />
        <div className="h-80 animate-pulse rounded-xl bg-[var(--tr-surface)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]" />
      </div>
    </div>
  );
}
