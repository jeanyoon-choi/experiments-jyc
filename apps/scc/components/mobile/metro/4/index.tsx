"use client";

import { useState } from "react";
import { Estate } from "./estate";
import { createArchive } from "./estate/archive";
import { MetroMap } from "./map";
import { type Scene, buildScene } from "./scene";
import { MAJOR } from "./travel";
import styles from "./metro.module.css";

const TABS = [
  { id: "map", label: "노선도" },
  { id: "times", label: "소요시간" },
  { id: "estate", label: "부동산" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/**
 * A standalone copy of /3 with two more tabs. 노선도 is /3 unchanged: take
 * hold of a station and put it somewhere else. 소요시간 is the same map,
 * still to be pinched, zoomed and pulled, with a row of major stations to
 * choose from: every station is tagged with its ride to the chosen one as the
 * map now lies (rides.ts, travel.ts) — being near a station is worth what the
 * ride from it costs, and here the ride is whatever a finger made it.
 * 부동산 reads the same rides as the property press and the assessor would
 * (estate/): an archive of reports that grows each time it is opened, and a
 * flat table of assessed prices.
 */
export default function MetroFour() {
  const [scene] = useState<Scene>(buildScene);
  const [archive] = useState(createArchive);
  const [rideTo, setRideTo] = useState<string>("강남");
  const [tab, setTab] = useState<Tab>("map");

  return (
    <main className={styles.shell}>
      <div className={styles.stage}>
        <MetroMap scene={scene} hidden={tab === "estate"} rideTo={tab === "times" ? rideTo : null} />
        {tab === "times" && (
          <div className={styles.picker} role="tablist" aria-label="어느 역까지">
            {[...MAJOR].map((name) => (
              <button key={name} type="button" role="tab" aria-selected={name === rideTo} className={styles.pick} onClick={() => setRideTo(name)}>
                {name}
              </button>
            ))}
          </div>
        )}
        {tab === "estate" && <Estate scene={scene} archive={archive} />}
      </div>
      <div className={styles.tabs}>
        <div className={styles.tablist} role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={styles.tab} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
