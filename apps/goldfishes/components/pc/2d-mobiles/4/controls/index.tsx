// pc/2d-mobiles/4's option menu, bottom right, in bubble/7's manner (as
// pc/2d-mobiles/1's): round triggers, one panel open at a time. The fifth,
// 필터, is this experiment's own: 치환, 물결, 어안 (docs/4.md).

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  DEATH_LABELS,
  DEATHS,
  FIELD_RANGES,
  FILTER_KEYS,
  FISH_RANGES,
  HOP_RANGES,
  LAYOUT_RANGES,
  LENS_CHOICES,
  LENS_RANGES,
  RHYTHM_RANGES,
  SUB_CHOICES,
  SUB_RANGES,
  TUNING_DEFAULTS,
  WATER_CHOICES,
  WATER_RANGES,
  type Choice,
  type Range,
  type Tuning,
} from "../model/tuning";
import styles from "./controls.module.css";

type PanelId = "rhythm" | "fish" | "field" | "layout" | "filter";

function Choices({ choices, tuning, setTuning }: { choices: readonly Choice[]; tuning: Tuning; setTuning: Dispatch<SetStateAction<Tuning>> }) {
  return choices.map((choice) => (
    <div key={choice.key}>
      <p className={styles.note}>{choice.label}</p>
      <div className={styles.chips} role="group" aria-label={choice.label}>
        {choice.options.map((option, value) => (
          <button key={option} type="button" aria-pressed={tuning[choice.key] === value} onClick={() => setTuning((current) => ({ ...current, [choice.key]: value }))}>
            {option}
          </button>
        ))}
      </div>
    </div>
  ));
}

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
        <div id="pc-mobiles-4-rhythm" className={styles.panel} role="group" aria-label="리듬">
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
        <div id="pc-mobiles-4-fish" className={styles.panel} role="group" aria-label="금붕어">
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
        <div id="pc-mobiles-4-field" className={styles.panel} role="group" aria-label="필드">
          <p className={styles.heading}>필드</p>
          <Ranges ranges={FIELD_RANGES} tuning={tuning} setTuning={setTuning} />
          <button type="button" className={styles.reset} onClick={() => setTuning(reset(FIELD_RANGES.map((range) => range.key)))}>
            기본값으로
          </button>
        </div>
      )}
      {panel === "layout" && (
        <div id="pc-mobiles-4-layout" className={styles.panel} role="group" aria-label="배치">
          <p className={styles.heading}>배치</p>
          <p className={styles.note}>바꾼 값은 주소에 남습니다 · 기본값은 model/tuning.ts</p>
          <Ranges ranges={LAYOUT_RANGES} tuning={tuning} setTuning={setTuning} />
          <button type="button" className={styles.reset} onClick={() => setTuning(reset(LAYOUT_RANGES.map((range) => range.key)))}>
            기본값으로
          </button>
        </div>
      )}
      {panel === "filter" && (
        <div id="pc-mobiles-4-filter" className={styles.panel} role="group" aria-label="필터">
          <p className={styles.heading}>치환</p>
          <Choices choices={SUB_CHOICES} tuning={tuning} setTuning={setTuning} />
          <Ranges ranges={SUB_RANGES} tuning={tuning} setTuning={setTuning} />
          <p className={styles.heading}>물결</p>
          <Ranges ranges={WATER_RANGES} tuning={tuning} setTuning={setTuning} />
          <Choices choices={WATER_CHOICES} tuning={tuning} setTuning={setTuning} />
          <p className={styles.heading}>어안</p>
          <Ranges ranges={LENS_RANGES} tuning={tuning} setTuning={setTuning} />
          <Choices choices={LENS_CHOICES} tuning={tuning} setTuning={setTuning} />
          <button type="button" className={styles.reset} onClick={() => setTuning(reset([...FILTER_KEYS, "thumb"]))}>
            기본값으로
          </button>
        </div>
      )}
      <div className={styles.triggers}>
        <button type="button" className={styles.trigger} aria-label="리듬 옵션" aria-expanded={panel === "rhythm"} aria-controls="pc-mobiles-4-rhythm" onClick={() => toggle("rhythm")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="3" y="4" width="6" height="12" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11" y="4" width="6" height="12" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 10h4M10.5 8.5 12 10l-1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className={styles.trigger} aria-label="금붕어 옵션" aria-expanded={panel === "fish"} aria-controls="pc-mobiles-4-fish" onClick={() => toggle("fish")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M3 10c2.5-3.5 6.5-4.5 10-2l3-2.5v9L13 12c-3.5 2.5-7.5 1.5-10-2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="6.5" cy="9.5" r="0.9" fill="currentColor" />
          </svg>
        </button>
        <button type="button" className={styles.trigger} aria-label="필드 옵션" aria-expanded={panel === "field"} aria-controls="pc-mobiles-4-field" onClick={() => toggle("field")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            {[3, 8.5, 14].flatMap((x) => [3, 10.5].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="3.5" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />))}
          </svg>
        </button>
        <button type="button" className={styles.trigger} aria-label="필터 옵션" aria-expanded={panel === "filter"} aria-controls="pc-mobiles-4-filter" onClick={() => toggle("filter")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 3.5c-3 2.2-3 10.8 0 13M10 3.5c3 2.200 3 10.8 0 13M3.5 10h13" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <button type="button" className={styles.trigger} aria-label="배치 옵션" aria-expanded={panel === "layout"} aria-controls="pc-mobiles-4-layout" onClick={() => toggle("layout")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="3" y="3" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M3 7.5h14M7.5 3v14" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
