"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { MouseEvent } from "react";
import { Badge, Card } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import {
  adaptListingToCardViewModel,
  type ListingCardViewModel,
} from "@/lib/listingAdapter";
import styles from "./ListingCard.module.css";

export type ListingCardVariant = "grid" | "list" | "compact";

export type ListingCardProps = {
  id?: string;
  title?: string;
  price?: number | string | null;
  currency?: string;
  city?: string | null;
  district?: string | null;
  category?: string | null;
  images?: string[] | null;
  createdAt?: string | number | Date | null;
  isSold?: boolean;
  isBoosted?: boolean;
  isNew?: boolean;
  isFavorited?: boolean;
  status?: string | null;
  listing?: unknown;
  viewModel?: ListingCardViewModel;
  onFavoriteToggle?: (id: string) => void;
  onLoginRequired?: () => void;
  href?: string;
  variant?: ListingCardVariant;
  className?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodePathname(pathname: string) {
  return pathname
    .split("/")
    .map((segment) => encodeURIComponent(safeDecodeURIComponent(segment)))
    .join("/");
}

function normalizeImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    return encodeURI(trimmed);
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.pathname = encodePathname(url.pathname);
    return url.toString();
  } catch {
    return null;
  }
}

function CameraIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.placeholderIcon}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M4.75 8.75A2.75 2.75 0 0 1 7.5 6h1.38c.35 0 .68-.16.89-.44l.66-.87c.33-.43.83-.69 1.37-.69h.4c.54 0 1.04.26 1.37.69l.66.87c.21.28.54.44.89.44h1.38a2.75 2.75 0 0 1 2.75 2.75v7.5A2.75 2.75 0 0 1 16.5 19h-9a2.75 2.75 0 0 1-2.75-2.75v-7.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M9.25 12.25a2.75 2.75 0 1 0 5.5 0 2.75 2.75 0 0 0-5.5 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
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
  isBoosted = false,
  isNew = false,
  isFavorited = false,
  status,
  listing,
  viewModel,
  onFavoriteToggle,
  onLoginRequired,
  href,
  variant = "grid",
  className,
}: ListingCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const adapted = viewModel ?? adaptListingToCardViewModel(listing ?? {
    id,
    title,
    price,
    category,
    images,
    createdAt,
    city,
    district,
    isSold,
    isBoosted,
    isFavorite: isFavorited,
    status,
  });
  const cardId = id || adapted.id;
  const cardTitle = title?.trim() || adapted.title;
  const cardImages = images ?? adapted.images;
  const image = normalizeImageUrl(cardImages.find((item) => !!item?.trim())) ?? normalizeImageUrl(adapted.imageUrl);
  const imageSrc = image && failedImage !== image ? image : null;
  const location = adapted.locationLabel;
  const date = adapted.createdAtLabel;
  const priceLabel = price !== undefined ? formatPrice(price, currency) : adapted.priceLabel;
  const cardIsSold = isSold || adapted.isSold;
  const cardIsBoosted = isBoosted || adapted.isBoosted;
  const cardIsFavorited = isFavorited || Boolean(adapted.isFavorite);
  const statusLabel = status || adapted.status;

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (onFavoriteToggle) {
      onFavoriteToggle(cardId);
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
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={`Photo de ${cardTitle}`}
              fill
              sizes={variant === "list" ? "(max-width: 760px) 34vw, 220px" : "(max-width: 760px) 50vw, 33vw"}
              className={styles.image}
              onError={() => setFailedImage(imageSrc)}
            />
          ) : (
            <div className={styles.placeholder} aria-label={`Image indisponible pour ${cardTitle}`}>
              <CameraIcon />
            </div>
          )}

          {(cardIsSold || cardIsBoosted || isNew || statusLabel) && (
            <div className={styles.badges}>
              {cardIsSold && <Badge variant="sold">Vendu</Badge>}
              {!cardIsSold && cardIsBoosted && <Badge variant="warning">Boost</Badge>}
              {!cardIsSold && !cardIsBoosted && isNew && <Badge variant="success">Nouveau</Badge>}
              {!cardIsSold && !cardIsBoosted && !isNew && statusLabel && (
                <Badge variant="neutral">{statusLabel}</Badge>
              )}
            </div>
          )}

          <button
            type="button"
            className={cx(styles.favorite, cardIsFavorited && styles.favoriteActive)}
            aria-label={cardIsFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-pressed={cardIsFavorited}
            onClick={handleFavoriteClick}
          >
            {cardIsFavorited ? "\u2665" : "\u2661"}
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.title}>{cardTitle}</div>
          <div className={styles.price}>{priceLabel}</div>

          {(location || date) && (
            <div className={styles.meta}>
              {location && <span className={styles.metaText}>{location}</span>}
              {location && date && <span aria-hidden="true">{"\u00b7"}</span>}
              {date && <span>{date}</span>}
            </div>
          )}
        </div>
      </div>

      {href && (
        <Link
          href={href}
          className={styles.cardOverlay}
          aria-label={`Voir l'annonce ${cardTitle}`}
        />
      )}
    </Card>
  );
}
