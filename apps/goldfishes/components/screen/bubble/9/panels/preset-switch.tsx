// The presets (presets/families.ts): one button shows which of them the values now are, steps to its neighbours and
// opens the list; [ and ] step too.

import { memo, useEffect, useRef, useState } from "react";
import type { Preset, PresetFamily } from "../presets";
import styles from "./mode-control.module.css";

type Props = {
  /** Families of numbered members, which of them the values now are (null: none), and choosing one. */
  families: readonly PresetFamily[];
  preset: Preset | null;
  onPreset: (preset: Preset) => void;
};

export const PresetSwitch = memo(function PresetSwitch({ families, preset, onPreset }: Props) {
  // The presets as one run (A1 … B4), to step through; from the last one chosen once a value has been moved.
  const [listed, setListed] = useState(false);
  const run = families.flatMap((family) => family.items);
  const now = preset ? run.indexOf(preset) : -1;
  const last = useRef(now);
  const choose = (at: number) => {
    const entry = run[(at + run.length) % run.length];
    if (!entry) return;
    last.current = run.indexOf(entry);
    onPreset(entry);
  };
  const step = (by: number) => choose((now >= 0 ? now : Math.max(last.current, 0)) + by);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  // [ and ], and ← and → (user, 2026-11-18): the preset before and after, from anywhere but a field being typed
  // in. The arrows stay a slider's own only while it was reached by the keyboard (Tab): one last dragged with the
  // pointer keeps the focus without showing it, and the arrows then moved it and no preset (user: "안되는데").
  // (:focus-visible does not tell the two apart here: it turns true at the first key pressed.) A list's and a text
  // area's arrows are theirs.
  useEffect(() => {
    let tabbed = false;
    const onPointer = () => {
      tabbed = false;
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") tabbed = true;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type !== "range") return;
      const slid = target instanceof HTMLInputElement && tabbed;
      const arrows = !(slid || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement);
      if (event.key === "[" || (arrows && event.key === "ArrowLeft")) stepRef.current(-1);
      else if (event.key === "]" || (arrows && event.key === "ArrowRight")) stepRef.current(1);
      else return;
      // An arrow would also scroll a panel that has the pointer's focus.
      if (event.key.startsWith("Arrow")) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  const shown = now >= 0 ? run[now]! : null;
  return (
    <>
      {listed && (
        <div id="bubble-nine-presets" className={styles.presets} role="group" aria-label="프리셋 목록">
          {families.map((family) => (
            <div key={family.letter} className={styles.family} role="group" aria-label={`${family.letter} ${family.label}`}>
              <p>
                <b>{family.letter}</b> {family.label}
              </p>
              {family.items.map((item) => (
                <button key={item.id} type="button" aria-pressed={preset === item} onClick={() => choose(run.indexOf(item))}>
                  <b>{item.label}</b> {item.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className={`${styles.switch} ${styles.presetSwitch}`} role="group" aria-label="프리셋">
        <button type="button" className={styles.fold} aria-label="이전 프리셋" onClick={() => step(-1)}>
          ‹
        </button>
        <button type="button" className={styles.preset} aria-expanded={listed} aria-controls="bubble-nine-presets" onClick={() => setListed((current) => !current)}>
          <b>{shown ? shown.label : "—"}</b> {shown ? shown.name : "직접 조정"}
        </button>
        <button type="button" className={styles.fold} aria-label="다음 프리셋" onClick={() => step(1)}>
          ›
        </button>
      </div>
    </>
  );
});
