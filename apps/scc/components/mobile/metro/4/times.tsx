"use client";

import { useMemo, useState } from "react";
import { type Line, lineById, stationById } from "./model";
import type { Scene } from "./scene";
import { CENTRES, MAJOR, minutesNow, minutesPrinted } from "./travel";
import styles from "./metro.module.css";

type Anchor = (typeof ANCHORS)[number];
const ANCHORS = CENTRES;

// Once stations have been moved: the rides that changed most, at most this many, nearest first, in place of the major stations.
const MOVERS = 40;

type Row = { id: string; name: string; lines: Line[]; now: number; change: number };

const row = (r: Row) => (
  <li key={r.id} className={styles.row}>
    <span className={styles.station}>
      {r.name}
      {r.lines.map((l) => (
        <span key={l.id} className={styles.line} style={{ background: l.colour }}>
          {l.badge.join("")}
        </span>
      ))}
    </span>
    {r.change !== 0 && (
      <span className={styles.change} data-way={r.change > 0 ? "up" : "down"}>
        {r.change > 0 ? "▲" : "▼"} {Math.abs(r.change)}분
      </span>
    )}
    <span className={styles.minutes}>{r.now}분</span>
  </li>
);

export function Times({ scene }: { scene: Scene }) {
  const [anchor, setAnchor] = useState<Anchor>(ANCHORS[0]);

  const { centres, rest } = useMemo(() => {
    const origin = scene.marks.find((m) => m.name === anchor);
    if (!origin) return { centres: [], rest: [] };
    const printed = minutesPrinted(scene, origin.node);
    const all: Row[] = scene.marks
      .filter((m) => printed.has(m.node))
      .map((m) => {
        const before = printed.get(m.node)!;
        const minutes = Math.round(minutesNow(scene, origin.node, m.node, before));
        const lines = (stationById.get(m.id)?.lines ?? []).map((id) => lineById.get(id)!);
        return { id: m.id, name: m.name, lines, now: minutes, change: minutes - Math.round(before) };
      });
    // The three centres stand apart at the top, the one counted to at 0분.
    const centres = ANCHORS.map((a) => all.find((r) => r.name === a)).filter((r): r is Row => Boolean(r));
    const apart = new Set(centres.map((r) => r.id));
    const others = all.filter((r) => !apart.has(r.id));
    const moved = others
      .filter((r) => r.change !== 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, MOVERS);
    const rest = moved.length ? moved : others.filter((r) => MAJOR.has(r.name));
    return { centres, rest: rest.sort((a, b) => a.now - b.now || a.name.localeCompare(b.name, "ko")) };
  }, [scene, anchor]);

  return (
    <section className={styles.times}>
      <div className={styles.anchors} role="tablist">
        {ANCHORS.map((a) => (
          <button key={a} type="button" role="tab" aria-selected={a === anchor} className={styles.anchor} onClick={() => setAnchor(a)}>
            {a}까지
          </button>
        ))}
      </div>
      <ol className={`${styles.rows} ${styles.centres}`}>{centres.map(row)}</ol>
      <ol className={styles.rows}>{rest.map(row)}</ol>
    </section>
  );
}
