"use client";

import { useState } from "react";
import type { Scene } from "../scene";
import { type Archive, update } from "./archive";
import { News } from "./news";
import { Prices } from "./prices";
import shared from "../metro.module.css";
import styles from "./estate.module.css";

// One scroll (user, 2026-11-23): the assessed prices first — the three
// centres, then the prices that changed — and under them the archive of
// reports.
export function Estate({ scene, archive }: { scene: Scene; archive: Archive }) {
  // Opening the tab brings the archive up to the map as it now lies.
  const [{ items, now }] = useState(() => {
    const time = Date.now();
    return { items: [...update(archive, scene, time)], now: time };
  });

  return (
    <section className={shared.times}>
      <h2 className={styles.heading}>공시가격</h2>
      <Prices scene={scene} />
      <h2 className={`${styles.heading} ${styles.below}`}>기사</h2>
      <News items={items} now={now} />
    </section>
  );
}
