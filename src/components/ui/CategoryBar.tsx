"use client";

import { useRouter } from "next/navigation";
import styles from "./CategoryBar.module.css";

const CATEGORIES = [
  { label: "Tout", slug: "", icon: "all" },
  { label: "Immo", slug: "immo", icon: "home" },
  { label: "Voitures", slug: "voiture", icon: "car" },
  { label: "Mode", slug: "mode", icon: "mode" },
  { label: "Maison", slug: "maison", icon: "homeGoods" },
  { label: "Electronique", slug: "electronique", icon: "tech" },
  { label: "Moto", slug: "moto", icon: "gauge" },
  { label: "Services", slug: "services", icon: "services" },
] as const;

export function CategoryBar() {
  const router = useRouter();

  const goToCategory = (slug: string) => {
    router.push(slug ? `/explorer?categorie=${slug}` : "/explorer");
  };

  return (
    <nav className={styles.categoryBar} aria-label="Categories principales">
      {CATEGORIES.map((category, index) => (
        <button
          className={`${styles.category} ${index === 0 ? styles.active : ""}`}
          key={category.label}
          type="button"
          onClick={() => goToCategory(category.slug)}
        >
          <span className={`${styles.icon} ${styles[category.icon]}`} aria-hidden="true" />
          <span>{category.label}</span>
        </button>
      ))}
    </nav>
  );
}
