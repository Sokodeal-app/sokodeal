import type { CSSProperties, HTMLAttributes } from "react";
import styles from "./UI.module.css";

type SkeletonVariant = "text" | "circle" | "rect" | "card";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
};

const variantClass: Record<SkeletonVariant, string> = {
  text: styles.skeletonText,
  circle: styles.skeletonCircle,
  rect: styles.skeletonRect,
  card: styles.skeletonCard,
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({ variant = "text", width, height, className, style, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx(styles.skeleton, variantClass[variant], className)}
      style={{ ...style, width, height }}
      {...props}
    />
  );
}
