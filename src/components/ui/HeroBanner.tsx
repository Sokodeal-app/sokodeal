"use client";

import { useRouter } from "next/navigation";
import styles from "./HeroBanner.module.css";

export function HeroBanner() {
  const router = useRouter();

  return (
    <section className={styles.heroBanner} aria-labelledby="homepage-hero-title">
      <div className={styles.copy}>
        <h1 className={styles.title} id="homepage-hero-title">
          Achetez.
          <br />
          Vendez.
          <br />
          <span>Louez.</span>
          <br />
          Sans effort.
        </h1>
        <button className={styles.cta} type="button" onClick={() => router.push("/explorer")}>
          Explorer maintenant
        </button>
      </div>
      <div className={styles.illustration} aria-hidden="true">
        <span className={styles.orbit} />
        <span className={styles.shapeOne} />
        <span className={styles.shapeTwo} />
      </div>
    </section>
  );
}
