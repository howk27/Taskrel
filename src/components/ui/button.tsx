"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[background,color,box-shadow] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "tr-primary-action",
  secondary:
    "border border-[var(--tr-border)] bg-[var(--tr-surface-2)] text-[var(--tr-text)] hover:bg-[var(--tr-surface-3)]",
  ghost:
    "bg-transparent text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]",
  destructive:
    "bg-[var(--tr-red)] text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          {children}
        </span>
      ) : children}
    </button>
  )
);
Button.displayName = "Button";
