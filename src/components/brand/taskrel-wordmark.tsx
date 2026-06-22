import type { HTMLAttributes } from "react";

type WordmarkSize = "sm" | "md" | "lg";

const sizeClass: Record<WordmarkSize, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
};

export function TaskrelWordmark({
  size = "md",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { size?: WordmarkSize }) {
  return (
    <span
      {...props}
      className={`inline-flex items-end font-black uppercase leading-none text-[var(--tr-text)] ${sizeClass[size]} ${className}`}
      style={{
        fontFamily: '"Arial Black", Impact, system-ui, sans-serif',
        letterSpacing: "0",
        ...props.style,
      }}
    >
      <span>TASK</span>
      <span className="relative ml-1 inline-flex flex-col items-stretch justify-end pb-[0.08em] text-[0.64em] text-[var(--tr-primary)]">
        <span className="mb-[0.16em] h-[0.16em] w-full rounded-full bg-[var(--tr-primary)]" aria-hidden="true" />
        <span>REL</span>
      </span>
    </span>
  );
}
