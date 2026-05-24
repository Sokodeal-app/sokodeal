"use client";

import Image from "next/image";
import { useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Badge } from "@/components/ui";
import {
  adaptListingToCardViewModel,
  type ListingCardViewModel,
} from "@/lib/listingAdapter";
import styles from "./ProfileListingCard.module.css";

type ProfileListingRecord = Record<string, unknown> & {
  id?: string | number | null;
  is_sold?: boolean | null;
  sold_at?: string | null;
  status?: string | null;
};

type ProfileListingCardProps = {
  ad: ProfileListingRecord;
  viewModel?: ListingCardViewModel;
  onEdit?: () => void;
  onMarkSold?: () => void;
  onDelete?: () => void;
  onOpen?: () => void;
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

function readOptionalCount(record: ProfileListingRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") continue;

    const count = Number(value);
    if (Number.isFinite(count)) return count;
  }

  return null;
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

function EyeIcon() {
  return (
    <svg aria-hidden="true" className={styles.statIcon} fill="none" viewBox="0 0 24 24">
      <path
        d="M2.06 12.35a10.75 10.75 0 0 1 19.88 0 10.75 10.75 0 0 1-19.88 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MessageCircleIcon() {
  return (
    <svg aria-hidden="true" className={styles.statIcon} fill="none" viewBox="0 0 24 24">
      <path
        d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ProfileListingCard({
  ad,
  viewModel,
  onEdit,
  onMarkSold,
  onDelete,
  onOpen,
}: ProfileListingCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const model = viewModel ?? adaptListingToCardViewModel(ad);
  const image = normalizeImageUrl(model.images.find((item) => !!item?.trim())) ?? normalizeImageUrl(model.imageUrl);
  const imageSrc = image && failedImage !== image ? image : null;
  const isSold = model.isSold || ad.is_sold === true || String(ad.status || "").toLowerCase() === "sold";
  const viewCount = readOptionalCount(ad, ["views_count", "viewsCount", "view_count", "viewCount"]);
  const messageCount = readOptionalCount(ad, ["messages_count", "messagesCount", "message_count", "messageCount"]);
  const hasMenu = Boolean(onOpen || onMarkSold || onDelete);

  const stopActionPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onOpen || event.currentTarget !== event.target) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      className={cx(styles.card, onOpen && styles.isInteractive)}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Voir l'annonce ${model.title}` : undefined}
    >
      <div className={styles.media}>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`Photo de ${model.title}`}
            fill
            sizes="(max-width: 760px) 50vw, 33vw"
            className={styles.image}
            onError={() => setFailedImage(imageSrc)}
          />
        ) : (
          <div className={styles.placeholder} aria-label={`Image indisponible pour ${model.title}`}>
            <CameraIcon />
          </div>
        )}

        <div className={styles.badgeRow}>
          <Badge variant={isSold ? "sold" : "success"}>{isSold ? "Vendu" : "Active"}</Badge>
          {!isSold && model.isBoosted && <Badge variant="warning">Boost</Badge>}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.title}>{model.title}</div>
        <div className={styles.price}>{model.priceLabel}</div>

        {(model.locationLabel || model.createdAtLabel) && (
          <div className={styles.meta}>
            {model.locationLabel && <span className={styles.metaText}>{model.locationLabel}</span>}
            {model.locationLabel && model.createdAtLabel && <span aria-hidden="true">{"\u00b7"}</span>}
            {model.createdAtLabel && <span>{model.createdAtLabel}</span>}
          </div>
        )}

        {(viewCount !== null || messageCount !== null) && (
          <div className={styles.stats}>
            {viewCount !== null && (
              <span className={styles.stat}>
                <EyeIcon />
                {viewCount.toLocaleString("fr-FR")}
              </span>
            )}
            {messageCount !== null && (
              <span className={styles.stat}>
                <MessageCircleIcon />
                {messageCount.toLocaleString("fr-FR")}
              </span>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {onEdit && (
            <button
              type="button"
              className={styles.editButton}
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
            >
              Modifier
            </button>
          )}

          {hasMenu && (
            <details className={styles.menu} onClick={stopActionPropagation}>
              <summary className={styles.menuSummary} aria-label="Actions de l'annonce">
                ...
              </summary>
              <div className={styles.menuPanel}>
                {onOpen && (
                  <button type="button" className={styles.menuItem} onClick={onOpen}>
                    Voir
                  </button>
                )}
                {!isSold && onMarkSold && (
                  <button type="button" className={styles.menuItem} onClick={onMarkSold}>
                    Marquer vendu
                  </button>
                )}
                {onDelete && (
                  <button type="button" className={cx(styles.menuItem, styles.dangerItem)} onClick={onDelete}>
                    Supprimer
                  </button>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}
