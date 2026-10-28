// pc/mobiles/2's option menu, bottom right, in bubble/7's manner (as
// pc/mobiles/1's): round triggers, one panel open at a time.

import { useState, type Dispatch, type SetStateAction } from "react";
import { DEATH_LABELS, DEATHS, FIELD_RANGES, FISH_RANGES, HOP_RANGES, RHYTHM_RANGES, TUNING_DEFAULTS, type Range, type Tuning } from "../model/tuning";
import styles from "./controls.module.css";

type PanelId = "rhythm" | "fish" | "field";

function Ranges({ ranges, tuning, setTuning }: { ranges: readonly Range[]; tuning: Tuning; setTuning: Dispatch<SetStateAction<Tuning>> }) {
  return ranges.map((range) => (
    <label key={range.key} className={styles.row}>
      <span>
        {range.label} <output>{range.format ? range.format(tuning[range.key]) : `${Math.round(tuning[range.key] * 100)}%`}</output>
      </span>
      <input
        aria-label={range.label}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={tuning[range.key]}
        onChange={(event) => {
          const value = Number(event.target.value);
          setTuning((current) => ({ ...current, [range.key]: value }));
        }}
      />
    </label>
  ));
}

function reset(keys: readonly (keyof Tuning)[]) {
  return (current: Tuning) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key, TUNING_DEFAULTS[key]])) });
}

export function Controls({ tuning, setTuning }: { tuning: Tuning; setTuning: Dispatch<SetStateAction<Tuning>> }) {
  const [panel, setPanel] = useState<PanelId | null>(null);
  const toggle = (id: PanelId) => setPanel((current) => (current === id ? null : id));
  return (
    <div className={styles.control}>
      {panel === "rhythm" && (
        <div id="pc-mobiles-2-rhythm" className={styles.panel} role="group" aria-label="리듬">
          <p className={styles.heading}>리듬</p>
          <Ranges ranges={RHYTHM_RANGES} tuning={tuning} setTuning={setTuning} />
          <p className={styles.note}>앱을 바꾸는 방식 (비율)</p>
          <Ranges ranges={HOP_RANGES} tuning={tuning} setTuning={setTuning} />
          <button type="button" className={styles.reset} onClick={() => setTuning(reset([...RHYTHM_RANGES, ...HOP_RANGES].map((range) => range.key)))}>
            기본값으로
          </button>
        </div>
      )}
      {panel === "fish" && (
        <div id="pc-mobiles-2-fish" className={styles.panel} role="group" aria-label="금붕어">
          <p className={styles.heading}>금붕어</p>
          <p className={styles.note}>죽음 · 과자극이나 정주로 죽었을 때</p>
          <div className={styles.chips} role="group" aria-label="죽음">
            {DEATHS.map((death) => (
              <button key={death} type="button" aria-pressed={tuning.death === death} onClick={() => setTuning((current) => ({ ...current, death }))}>
                {DEATH_LABELS[death]}
              </button>
            ))}
          </div>
          <Ranges ranges={FISH_RANGES} tuning={tuning} setTuning={setTuning} />
          <button type="button" className={styles.reset} onClick={() => setTuning(reset(["death", ...FISH_RANGES.map((range) => range.key)]))}>
            기본값으로
          </button>
        </div>
      )}
      {panel === "field" && (
        <div id="pc-mobiles-2-field" className={styles.panel} role="group" aria-label="필드">
          <p className={styles.heading}>필드</p>
          <Ranges ranges={FIELD_RANGES} tuning={tuning} setTuning={setTuning} />
          <button type="button" className={styles.reset} onClick={() => setTuning(reset(FIELD_RANGES.map((range) => range.key)))}>
            기본값으로
          </button>
        </div>
      )}
      <div className={styles.triggers}>
        <button type="button" className={styles.trigger} aria-label="리듬 옵션" aria-expanded={panel === "rhythm"} aria-controls="pc-mobiles-2-rhythm" onClick={() => toggle("rhythm")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="3" y="4" width="6" height="12" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11" y="4" width="6" height="12" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 10h4M10.5 8.5 12 10l-1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className={styles.trigger} aria-label="금붕어 옵션" aria-expanded={panel === "fish"} aria-controls="pc-mobiles-2-fish" onClick={() => toggle("fish")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M3 10c2.5-3.5 6.5-4.5 10-2l3-2.5v9L13 12c-3.5 2.5-7.5 1.5-10-2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="6.5" cy="9.5" r="0.9" fill="currentColor" />
          </svg>
        </button>
        <button type="button" className={styles.trigger} aria-label="필드 옵션" aria-expanded={panel === "field"} aria-controls="pc-mobiles-2-field" onClick={() => toggle("field")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            {[3, 8.5, 14].flatMap((x) => [3, 10.5].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="3.5" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />))}
          </svg>
        </button>
      </div>
    </div>
  );
}
