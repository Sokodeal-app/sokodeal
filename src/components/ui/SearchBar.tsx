"use client";

import { useRouter } from "next/navigation";
import styles from "./SearchBar.module.css";

export function SearchBar() {
  const router = useRouter();

  return (
    <button
      className={styles.searchBar}
      type="button"
      onClick={() => router.push("/explorer")}
      aria-label="Rechercher une annonce"
    >
      <span className={styles.searchIcon} aria-hidden="true" />
      <span className={styles.placeholder}>Rechercher une annonce...</span>
      <span className={styles.location}>
        <span className={styles.pinIcon} aria-hidden="true" />
        Kigali
      </span>
    </button>
  );
}
