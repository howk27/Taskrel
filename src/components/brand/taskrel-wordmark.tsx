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
      className={`inline-flex items-baseline font-black uppercase leading-none text-white ${sizeClass[size]} ${className}`}
      style={{
        fontFamily: '"Arial Black", Impact, system-ui, sans-serif',
        letterSpacing: "0",
        ...props.style,
      }}
    >
      <span>TASK</span>
      <span className="text-[var(--tr-orange)]">REL</span>
    </span>
  );
}
