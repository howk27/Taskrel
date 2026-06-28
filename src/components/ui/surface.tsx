import type { HTMLAttributes } from "react";

type Elevation = "flat" | "raised" | "overlay";

const elevationClass: Record<Elevation, string> = {
  flat: "tr-card",
  raised: "tr-elevation-raised",
  overlay: "tr-elevation-overlay",
};

export function Surface({
  className = "",
  elevation = "flat",
  ...props
}: HTMLAttributes<HTMLDivElement> & { elevation?: Elevation }) {
  return (
    <div
      className={`${elevationClass[elevation]} rounded-lg ${className}`}
      {...props}
    />
  );
}
