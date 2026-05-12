import type { HTMLAttributes, ReactNode } from "react";
import styles from "./UI.module.css";

type CardVariant = "default" | "soft" | "highlight" | "interactive";
type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  className?: string;
};

const variantClass: Record<CardVariant, string> = {
  default: styles.cardDefault,
  soft: styles.cardSoft,
  highlight: styles.cardHighlight,
  interactive: styles.cardInteractive,
};

const paddingClass: Record<CardPadding, string> = {
  none: styles.cardPaddingNone,
  sm: styles.cardPaddingSm,
  md: styles.cardPaddingMd,
  lg: styles.cardPaddingLg,
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  className,
  ...props
}: CardProps) {
  return (
    <div className={cx(styles.card, variantClass[variant], paddingClass[padding], className)} {...props}>
      {children}
    </div>
  );
}
