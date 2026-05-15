"use client";

import { useRouter } from "next/navigation";
import styles from "./QuickExplore.module.css";

const ITEMS = [
  { label: "Tendances", href: "/explorer?tri=populaire", icon: "flame" },
  { label: "Pres de moi", href: "/explorer?localisation=moi", icon: "pin" },
  { label: "Locations", href: "/explorer?categorie=immobilier", icon: "home" },
  { label: "Bonnes affaires", href: "/explorer?tri=prix-croissant", icon: "tag" },
] as const;

export function QuickExplore() {
  const router = useRouter();

  return (
    <div className={styles.grid}>
      {ITEMS.map((item) => (
        <button className={styles.item} key={item.href} type="button" onClick={() => router.push(item.href)}>
          <span className={`${styles.icon} ${styles[item.icon]}`} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
