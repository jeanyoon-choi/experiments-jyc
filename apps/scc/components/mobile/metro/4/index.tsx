"use client";

import { useCallback, useRef, useState } from "react";
import { Estate } from "./estate";
import { createArchive } from "./estate/archive";
import { MetroMap } from "./map";
import { type Scene, buildScene } from "./scene";
import { minutesNow } from "./travel";
import styles from "./metro.module.css";

const TABS = [
  { id: "map", label: "노선도" },
  { id: "times", label: "소요시간" },
  { id: "estate", label: "부동산" },
] as const;
type Tab = (typeof TABS)[number]["id"];
// 소요시간: the stations rides can be counted to; each button also carries its own ride to the chosen one.
const PICKS = ["강남", "시청", "여의도", "서울역"] as const;
// 소요시간: the one line above the tabs names this many of the rides that changed most.
const MOVERS = 8;

/**
 * A standalone copy of /3 with two more tabs. 노선도 is /3 unchanged: take
 * hold of a station and put it somewhere else. 소요시간 is the same map,
 * still to be pinched, zoomed and pulled, with 강남, 시청, 여의도 and 서울역
 * to choose from: every station is tagged with its ride to the chosen one as the
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
  const minuteRefs = useRef(new Map<string, HTMLSpanElement>());
  const moversRef = useRef<HTMLDivElement>(null);
  // Each frame of the map, the four buttons' own rides to the chosen station.
  const onRides = useCallback(
    (origin: number, printed: Map<number, number>) => {
      for (const name of PICKS) {
        const span = minuteRefs.current.get(name);
        const mark = scene.marks.find((m) => m.name === name);
        const before = mark && printed.get(mark.node);
        if (!span || !mark || before === undefined) continue;
        const text = `${mark.node === origin ? 0 : Math.round(minutesNow(scene, origin, mark.node, before))}분`;
        if (span.textContent !== text) span.textContent = text;
      }
      // The line of movers: the rides to the chosen station that changed most, largest first.
      const line = moversRef.current;
      if (!line) return;
      const moved: { name: string; change: number }[] = [];
      for (const m of scene.marks) {
        const before = printed.get(m.node);
        if (before === undefined || m.node === origin) continue;
        const change = Math.round(minutesNow(scene, origin, m.node, before)) - Math.round(before);
        if (change !== 0) moved.push({ name: m.name, change });
      }
      moved.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      const top = moved.slice(0, MOVERS);
      const key = top.map((r) => `${r.name}${r.change}`).join("|");
      if (line.dataset.key === key) return;
      line.dataset.key = key;
      line.replaceChildren(
        ...top.map((r) => {
          const item = document.createElement("span");
          item.append(`${r.name} `);
          const change = document.createElement("b");
          change.dataset.way = r.change > 0 ? "up" : "down";
          change.textContent = `${r.change > 0 ? "▲" : "▼"}${Math.abs(r.change)}분`;
          item.append(change);
          return item;
        }),
      );
    },
    [scene],
  );
  const [tab, setTab] = useState<Tab>("map");

  return (
    <main className={styles.shell}>
      <div className={styles.stage}>
        <MetroMap scene={scene} hidden={tab === "estate"} rideTo={tab === "times" ? rideTo : null} onRides={onRides} />
        {tab === "times" && (
          <div className={styles.picker} role="tablist" aria-label="어느 역까지">
            {PICKS.map((name) => (
              <button key={name} type="button" role="tab" aria-selected={name === rideTo} className={styles.pick} onClick={() => setRideTo(name)}>
                {name}
                <span
                  className={styles.pickMinutes}
                  ref={(el) => {
                    if (el) minuteRefs.current.set(name, el);
                    else minuteRefs.current.delete(name);
                  }}
                />
              </button>
            ))}
          </div>
        )}
        {tab === "times" && <div ref={moversRef} className={styles.movers} aria-label="가장 많이 달라진 역" />}
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
