"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import styles from "./BottomNav.module.css";

type NavItem = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  isPrimary?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: "/",
    match: (pathname) => pathname === "/",
  },
  {
    label: "Favoris",
    href: "/favoris",
    match: (pathname) => pathname.startsWith("/favoris"),
  },
  {
    label: "Publier",
    href: "/publier",
    match: (pathname) => pathname.startsWith("/publier"),
    isPrimary: true,
  },
  {
    label: "Messages",
    href: "/messages",
    match: (pathname) => pathname.startsWith("/messages"),
  },
  {
    label: "Profil",
    href: "/profil",
    match: (pathname) => pathname.startsWith("/profil"),
  },
];

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function shouldHideBottomNav(pathname: string) {
  return (
    pathname.startsWith("/annonce/") ||
    pathname.startsWith("/modifier/") ||
    pathname.startsWith("/publier") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin")
  );
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type BottomNavProps = {
  withSpacer?: boolean;
};

/**
 * Mobile-only bottom navigation.
 * Pages that render this component should reserve enough bottom padding
 * using var(--sd-bottom-nav-height) to avoid hiding page content behind it.
 */
export function BottomNav({ withSpacer = false }: BottomNavProps) {
  const pathname = usePathname() || "/";

  if (shouldHideBottomNav(pathname)) return null;

  return (
    <Fragment>
      <nav className={cx("bottom-nav", styles.nav)} aria-label="Navigation principale mobile">
        <div className={cx("bottom-nav__inner", styles.inner)}>
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? item.match(pathname) : matchesRoute(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "bottom-nav__item",
                  styles.item,
                  active && styles.active,
                  active && "is-active",
                  item.isPrimary && styles.primary,
                  item.isPrimary && "is-primary",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {withSpacer ? <div className={cx("bottom-nav__spacer", styles.spacer)} aria-hidden="true" /> : null}
    </Fragment>
  );
}
