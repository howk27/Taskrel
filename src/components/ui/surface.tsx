import type { HTMLAttributes } from "react";

export function Surface({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`tr-card rounded-xl ${className}`}
      {...props}
    />
  );
}
