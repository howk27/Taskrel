import type { HTMLAttributes } from "react";

export function Surface({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-slate-800 bg-[#172235] shadow-[0_1px_0_rgba(255,255,255,0.03)] ${className}`}
      {...props}
    />
  );
}
