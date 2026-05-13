import type { HTMLAttributes, ReactNode } from "react";
import styles from "./UI.module.css";

type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info" | "verified" | "sold" | "comingSoon";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClass: Record<BadgeVariant, string> = {
  neutral: styles.badgeNeutral,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  error: styles.badgeError,
  info: styles.badgeInfo,
  verified: styles.badgeVerified,
  sold: styles.badgeSold,
  comingSoon: styles.badgeComingSoon,
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Badge({ children, variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span className={cx(styles.badge, variantClass[variant], className)} {...props}>
      {children}
    </span>
  );
}
