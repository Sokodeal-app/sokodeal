import { Card, Skeleton } from "@/components/ui";
import type { ListingCardVariant } from "./ListingCard";
import styles from "./ListingCard.module.css";

export type ListingCardSkeletonProps = {
  variant?: ListingCardVariant;
  className?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ListingCardSkeleton({ variant = "grid", className }: ListingCardSkeletonProps) {
  return (
    <Card padding="none" className={cx(styles.card, styles[variant], className)} aria-busy="true">
      <div className={cx(styles.content, styles[variant])}>
        <div className={styles.media}>
          <Skeleton variant="rect" width="100%" height="100%" />
        </div>

        <div className={styles.body}>
          <Skeleton variant="text" width="86%" height="0.95rem" />
          <Skeleton variant="text" width="56%" height="1rem" />
          <Skeleton variant="text" width="72%" height="0.75rem" />
        </div>
      </div>
    </Card>
  );
}
