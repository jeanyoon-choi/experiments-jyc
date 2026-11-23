"use client";

import { useMemo } from "react";
import { type Line, lineById, stationById } from "../model";
import type { Scene } from "../scene";
import { CENTRES, MAJOR, ridesTo } from "../travel";
import { type Centre, assessed } from "./price";
import shared from "../metro.module.css";
import styles from "./estate.module.css";

// Once stations have been moved: the prices that changed most, at most this many, dearest first, in place of the major stations.
const MOVERS = 40;

type Row = { id: string; name: string; lines: Line[]; now: number; change: number };

const row = (r: Row) => (
  <li key={r.id} className={shared.row}>
    <span className={shared.station}>
      {r.name}
      {r.lines.map((l) => (
        <span key={l.id} className={shared.line} style={{ background: l.colour }}>
          {l.badge.join("")}
        </span>
      ))}
    </span>
    {Math.abs(r.change) >= 0.1 && (
      <span className={shared.change} data-way={r.change > 0 ? "up" : "down"}>
        {r.change > 0 ? "▲" : "▼"} {Math.abs(r.change).toFixed(1)}%
      </span>
    )}
    <span className={styles.price}>{Math.round(r.now).toLocaleString("ko-KR")}</span>
  </li>
);

/** Every station's 공시가격 per ㎡ as price.ts reckons it from the rides, stated flatly: the three centres, then the rest. */
export function Prices({ scene }: { scene: Scene }) {
  const { centres, rest } = useMemo(() => {
    const rides = CENTRES.map((centre) => ridesTo(scene, centre));
    if (rides.some((r) => !r)) return { centres: [], rest: [] };
    const all: Row[] = [];
    for (const m of scene.marks) {
      const before = {} as Record<Centre, number>;
      const now = {} as Record<Centre, number>;
      let reached = true;
      CENTRES.forEach((centre, i) => {
        const ride = rides[i]!.get(m.node);
        if (!ride) reached = false;
        else {
          before[centre] = ride.before;
          now[centre] = ride.now;
        }
      });
      if (!reached) continue;
      const was = assessed(before);
      const price = assessed(now);
      const lines = (stationById.get(m.id)?.lines ?? []).map((id) => lineById.get(id)!);
      all.push({ id: m.id, name: m.name, lines, now: price, change: ((price - was) / was) * 100 });
    }
    const centres = CENTRES.map((c) => all.find((r) => r.name === c)).filter((r): r is Row => Boolean(r));
    const apart = new Set(centres.map((r) => r.id));
    const others = all.filter((r) => !apart.has(r.id));
    const moved = others
      .filter((r) => Math.abs(r.change) >= 0.1)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, MOVERS);
    const rest = moved.length ? moved : others.filter((r) => MAJOR.has(r.name));
    return { centres, rest: rest.sort((a, b) => b.now - a.now || a.name.localeCompare(b.name, "ko")) };
  }, [scene]);

  return (
    <>
      <p className={styles.unit}>㎡당 공시가격, 만원</p>
      <ol className={`${shared.rows} ${shared.centres}`}>{centres.map(row)}</ol>
      <ol className={shared.rows}>{rest.map(row)}</ol>
    </>
  );
}
