import type { ReactNode } from "react";
import { Button } from "./Button";
import styles from "./UI.module.css";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <section className={cx(styles.emptyState, className)}>
      {icon ? <div className={styles.emptyIcon}>{icon}</div> : null}
      <h2 className={styles.emptyTitle}>{title}</h2>
      {description ? <p className={styles.emptyDescription}>{description}</p> : null}
      {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
      {children}
    </section>
  );
}
