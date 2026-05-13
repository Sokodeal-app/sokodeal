import type { ReactNode } from "react";
import styles from "./UI.module.css";

type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SectionHeader({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cx(styles.sectionHeader, className)}>
      <div className={styles.sectionCopy}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description ? <p className={styles.sectionDescription}>{description}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <button className={styles.sectionAction} onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
