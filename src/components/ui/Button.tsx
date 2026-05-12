import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./UI.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  href?: string;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDanger,
  soft: styles.buttonSoft,
};

const sizeClass: Record<ButtonSize, string> = {
  sm: styles.buttonSm,
  md: styles.buttonMd,
  lg: styles.buttonLg,
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  className,
  href,
  type = "button",
  ...props
}: ButtonProps) {
  const classNames = cx(
    styles.button,
    variantClass[variant],
    sizeClass[size],
    fullWidth && styles.buttonFullWidth,
    (disabled || loading) && styles.buttonDisabled,
    className
  );
  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classNames} aria-disabled={disabled || loading}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classNames} disabled={disabled || loading} type={type} {...props}>
      {content}
    </button>
  );
}
