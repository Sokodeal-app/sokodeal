import type { ReactNode } from "react";
import styles from "./ListingGrid.module.css";

export type ListingGridProps = {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  gap?: "sm" | "md" | "lg";
  className?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ListingGrid({
  children,
  columns = 3,
  gap = "md",
  className,
}: ListingGridProps) {
  return (
    <div
      className={cx(
        styles.grid,
        styles[`columns${columns}`],
        styles[`gap${gap[0].toUpperCase()}${gap.slice(1)}`],
        className,
      )}
    >
      {children}
    </div>
  );
}
