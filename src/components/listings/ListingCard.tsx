"use client";

import Link from "next/link";
import Image from "next/image";
import type { MouseEvent } from "react";
import { Badge, Card } from "@/components/ui";
import styles from "./ListingCard.module.css";

export type ListingCardVariant = "grid" | "list" | "compact";

export type ListingCardProps = {
  id: string;
  title: string;
  price?: number | null;
  currency?: string;
  city?: string | null;
  district?: string | null;
  category?: string | null;
  images?: string[] | null;
  createdAt?: string | null;
  isSold?: boolean;
  isNew?: boolean;
  isFavorited?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onLoginRequired?: () => void;
  href?: string;
  variant?: ListingCardVariant;
  className?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatPrice(price: number | null | undefined, currency: string) {
  if (price === null || price === undefined) return "Prix sur demande";
  return `${Number(price).toLocaleString("fr-FR")} ${currency}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function getPlaceholderLabel(category: string | null | undefined, title: string) {
  const source = category || title || "S";
  return source.trim().charAt(0).toUpperCase() || "S";
}

export function ListingCard({
  id,
  title,
  price,
  currency = "RWF",
  city,
  district,
  category,
  images,
  createdAt,
  isSold = false,
  isNew = false,
  isFavorited = false,
  onFavoriteToggle,
  onLoginRequired,
  href,
  variant = "grid",
  className,
}: ListingCardProps) {
  const image = images?.find(Boolean);
  const location = [city, district].filter(Boolean).join(" · ");
  const date = formatDate(createdAt);
  const priceLabel = formatPrice(price, currency);

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (onFavoriteToggle) {
      onFavoriteToggle(id);
      return;
    }

    onLoginRequired?.();
  };

  return (
    <Card
      padding="none"
      variant={href ? "interactive" : "default"}
      className={cx(styles.card, styles[variant], href && styles.cardWithHref, className)}
    >
      <div className={cx(styles.content, styles[variant])}>
        <div className={styles.media}>
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes={variant === "list" ? "(max-width: 760px) 34vw, 220px" : "(max-width: 760px) 50vw, 33vw"}
              className={styles.image}
            />
          ) : (
            <div className={styles.placeholder} aria-label="Image indisponible">
              {getPlaceholderLabel(category, title)}
            </div>
          )}

          {(isSold || isNew) && (
            <div className={styles.badges}>
              {isSold && <Badge variant="sold">Vendu</Badge>}
              {!isSold && isNew && <Badge variant="success">Nouveau</Badge>}
            </div>
          )}

          <button
            type="button"
            className={cx(styles.favorite, isFavorited && styles.favoriteActive)}
            aria-label={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-pressed={isFavorited}
            onClick={handleFavoriteClick}
          >
            {isFavorited ? "\u2665" : "\u2661"}
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.title}>{title}</div>
          <div className={styles.price}>{priceLabel}</div>

          {(location || date) && (
            <div className={styles.meta}>
              {location && <span className={styles.metaText}>{location}</span>}
              {location && date && <span aria-hidden="true">·</span>}
              {date && <span>{date}</span>}
            </div>
          )}
        </div>
      </div>

      {href && (
        <Link
          href={href}
          className={styles.cardOverlay}
          aria-label={`Voir l'annonce ${title}`}
        />
      )}
    </Card>
  );
}
