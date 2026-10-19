"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavigationExperiment } from "@/components/experiments";
import { getActivity, getXytCubeArchive } from "./archive";
import styles from "./navigation.module.css";

type Props = {
  experiments: readonly NavigationExperiment[];
  scope?: "screen" | "mobile";
  archiveDate?: string;
};

export default function XytCubeNavigation({ experiments, scope, archiveDate }: Props) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  // Most recent activity first: a major revision lifts an experiment, and its
  // dated archive group, to the top; the group still links to its creation archive.
  const filtered = experiments
    .filter((item) =>
      [item.key, item.label, item.date, item.updated ?? ""].join(" ").toLowerCase().includes(search),
    )
    .sort((a, b) => getActivity(b).localeCompare(getActivity(a)) || a.key.localeCompare(b.key));
  const groups = [...new Set(filtered.map(getXytCubeArchive))];

  return (
    <main className={styles.archive}>
      <header className={styles.header}>
        <h1>
          {scope ? <Link href="/">xyt-cube</Link> : "xyt-cube"}
          {scope && <> / <Link href={`/${scope}`}>{scope}</Link></>}
          {archiveDate && <> / {archiveDate}</>}
        </h1>
        <label className={styles.search}>
          <span className={styles.visuallyHidden}>Search experiments</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search experiments"
          />
        </label>
        <div className={styles.families}>
          <Link href="/screen" className={styles.familyLink}>screen</Link>
          <Link href="/mobile" className={styles.familyLink}>mobile</Link>
        </div>
      </header>

      <nav aria-label="xyt-cube experiments" className={styles.list}>
        {groups.map((group) => (
          <section key={group} className={styles.group}>
            <h2>
              {archiveDate ? archiveDate : <Link href={`/${group}`}>{scope ? group.split("/")[1] : group}</Link>}
            </h2>
            {filtered.filter((item) => getXytCubeArchive(item) === group).map((item) => (
              <Link key={item.key} href={`/${item.key}`} className={styles.experiment}>
                <span>{item.label}</span>
                <span className={styles.path}>/{item.key}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </section>
        ))}
        {filtered.length === 0 && <p className={styles.empty}>No matching experiments.</p>}
      </nav>
    </main>
  );
}
