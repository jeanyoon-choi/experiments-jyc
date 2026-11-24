"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Diagram, type Mode } from "./diagram/diagram.tsx";
import { CURRENT, HYPOTHESES, VERSIONS, say, type Lang } from "./model/index.ts";
import { Panel } from "./panel.tsx";
import { usePref } from "./prefs.ts";
import styles from "./system.module.css";
import { STATUS, WORDS } from "./words.ts";

// The map of the whole work: the devices, what passes between them, what is
// built and what is still asked. Everything shown is read from ./model.
//
// The address holds the view (?v=v2&mode=built&sel=feedback), so the artist
// and an agent can point each other at the same part. It is changed in the
// browser alone (history.replaceState), never through the server, so a step
// between versions is immediate.

const MODES: Mode[] = ["relations", "built", "questions"];

function System() {
  const params = useSearchParams();
  const [theme, setTheme] = usePref("goldfishes-system-theme");
  const [storedLang, setLang] = usePref("goldfishes-system-lang");
  const lang: Lang = storedLang === "en" ? "en" : "ko";

  const version = VERSIONS.find((candidate) => candidate.id === params.get("v")) ?? CURRENT;
  const mode = MODES.find((candidate) => candidate === params.get("mode")) ?? "relations";
  const selected = params.get("sel");

  function go(change: Record<string, string | null>) {
    // From the address itself, so two changes in a row do not undo each other.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(change)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  // The parts an open question is about: the selected question's, or every one's.
  const asked = useMemo(() => {
    const open = HYPOTHESES.filter((hypothesis) => hypothesis.state !== "supported" && hypothesis.state !== "rejected");
    const chosen = open.filter((hypothesis) => `h:${hypothesis.id}` === selected);
    return new Set((chosen.length > 0 ? chosen : open).flatMap((hypothesis) => hypothesis.about));
  }, [selected]);

  return (
    <main className={styles.root} data-theme={theme === "light" || theme === "dark" ? theme : undefined} lang={lang}>
      <div className={styles.field}>
        <Diagram
          version={version}
          lang={lang}
          mode={selected?.startsWith("h:") ? "questions" : mode}
          selected={selected}
          asked={asked}
          onSelect={(id) => go({ sel: id })}
        />
        {mode === "built" && (
          <p className={styles.legend}>
            <span className={styles.legendWorking}>{say(STATUS.working, lang)}</span>
            <span>{say(STATUS.partial, lang)}</span>
            <span className={styles.legendAbsent}>
              {say(STATUS.none, lang)} · {say(STATUS.undecided, lang)}
            </span>
          </p>
        )}
      </div>

      <aside className={styles.side}>
        <header className={styles.top}>
          <div className={styles.bar}>
            <Link href="/" className={styles.title}>
              Goldfishes — system
            </Link>
            <span className={styles.row}>
              <button type="button" className={`${styles.chip} ${styles.light}`} aria-label={say(WORDS.white, lang)} onClick={() => setTheme("light")}>
                W
              </button>
              <button type="button" className={`${styles.chip} ${styles.dark}`} aria-label={say(WORDS.black, lang)} onClick={() => setTheme("dark")}>
                B
              </button>
              <button type="button" className={styles.chip} aria-pressed={lang === "ko"} onClick={() => setLang("ko")}>
                한
              </button>
              <button type="button" className={styles.chip} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                EN
              </button>
            </span>
          </div>
          <nav className={styles.row} aria-label={say(WORDS.versions, lang)}>
            {VERSIONS.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className={styles.chip}
                aria-pressed={candidate.id === version.id}
                onClick={() => go({ v: candidate.id === CURRENT.id ? null : candidate.id, sel: null })}
              >
                {candidate.id} · {candidate.date.slice(5)}
              </button>
            ))}
          </nav>
          <nav className={styles.row} aria-label={say(WORDS.view, lang)}>
            {MODES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={styles.chip}
                aria-pressed={candidate === mode}
                onClick={() => go({ mode: candidate === "relations" ? null : candidate })}
              >
                {say(WORDS[candidate], lang)}
              </button>
            ))}
          </nav>
        </header>
        <Panel version={version} lang={lang} selected={selected} onSelect={(id) => go({ sel: id })} />
      </aside>
    </main>
  );
}

export default function GoldfishesSystem() {
  return (
    <Suspense>
      <System />
    </Suspense>
  );
}
