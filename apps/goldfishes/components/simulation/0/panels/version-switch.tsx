// The versions (controls.ts): one button shows which of them the values now are, steps to its neighbours and opens
// the list; [ and ] step too (bubble/9's preset switch, copied).

import { memo, useEffect, useRef, useState } from "react";
import { VERSIONS, type VersionId } from "../controls.ts";
import styles from "../ui/controls.module.css";

type Props = {
  /** Which version the values now are (null: one has been moved), and choosing one. */
  version: VersionId | null;
  onVersion: (version: VersionId) => void;
};

export const VersionSwitch = memo(function VersionSwitch({ version, onVersion }: Props) {
  const [listed, setListed] = useState(false);
  const now = VERSIONS.findIndex((entry) => entry.id === version);
  // Stepping goes on from the last version chosen once a value has been moved.
  const last = useRef(now);
  const choose = (at: number) => {
    const index = (at + VERSIONS.length) % VERSIONS.length;
    last.current = index;
    onVersion(VERSIONS[index]!.id);
  };
  const step = (by: number) => choose((now >= 0 ? now : Math.max(last.current, 0)) + by);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "[") stepRef.current(-1);
      else if (event.key === "]") stepRef.current(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const shown = now >= 0 ? VERSIONS[now]! : null;
  return (
    <div className={styles.versions}>
      {listed && (
        <div id="simulation-versions" className={styles.list} role="group" aria-label="버전 목록">
          {VERSIONS.map((entry, index) => (
            <button key={entry.id} type="button" aria-pressed={version === entry.id} onClick={() => choose(index)}>
              <b>{entry.id}</b> {entry.name}
            </button>
          ))}
        </div>
      )}
      <div className={styles.switch} role="group" aria-label="버전">
        <button type="button" className={styles.fold} aria-label="이전 버전" onClick={() => step(-1)}>
          ‹
        </button>
        <button type="button" className={styles.version} aria-expanded={listed} aria-controls="simulation-versions" onClick={() => setListed((current) => !current)}>
          <b>{shown ? shown.id : "—"}</b> {shown ? shown.name : "직접 조정"}
        </button>
        <button type="button" className={styles.fold} aria-label="다음 버전" onClick={() => step(1)}>
          ›
        </button>
      </div>
    </div>
  );
});
