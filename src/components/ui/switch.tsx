"use client";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * Accessible on/off toggle. Renders a real button with role="switch" so it is
 * keyboard- and screen-reader-friendly, styled with design tokens (no raw
 * palette colors). Reusable across settings and future tool surfaces.
 */
export function Switch({ checked, onCheckedChange, label, description, disabled, id }: SwitchProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-bg-soft)] px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--tr-text)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-sm text-[var(--tr-text-muted)]">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tr-primary)] disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-[var(--tr-primary)]" : "bg-[var(--tr-surface-3)]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
