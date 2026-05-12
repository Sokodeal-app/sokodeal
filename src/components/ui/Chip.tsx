import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./UI.module.css";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  active?: boolean;
  className?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Chip({
  children,
  active = false,
  disabled = false,
  className,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      className={cx(styles.chip, active && styles.chipActive, className)}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
