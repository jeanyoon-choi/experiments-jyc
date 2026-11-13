// pc/mobiles/1's option menu, bottom right, in bubble/7's manner: round
// triggers, one panel open at a time (user, 2026-10-27).

import { useState, type Dispatch, type SetStateAction } from "react";
import { HOP_RANGES, HOP_STYLES, MOTION_RANGES, PC_TUNING_DEFAULTS, PHONE_RANGES, type PcTuning } from "../model/tuning";
import styles from "./controls.module.css";

type PanelId = "hop" | "motion";

function Ranges({ ranges, tuning, setTuning }: { ranges: typeof HOP_RANGES; tuning: PcTuning; setTuning: Dispatch<SetStateAction<PcTuning>> }) {
  return ranges.map((range) => (
    <label key={range.key} className={styles.row}>
      <span>
        {range.label} <output>{range.format(tuning[range.key])}</output>
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

export function Controls({ tuning, setTuning }: { tuning: PcTuning; setTuning: Dispatch<SetStateAction<PcTuning>> }) {
  const [panel, setPanel] = useState<PanelId | null>(null);
  const toggle = (id: PanelId) => setPanel((current) => (current === id ? null : id));
  return (
    <div className={styles.control}>
      {panel === "hop" && (
        <div id="pc-mobiles-hop" className={styles.panel} role="group" aria-label="앱 이동">
          <p className={styles.heading}>앱 이동</p>
          <p className={styles.note}>새 글이 오면 다른 앱으로 넘어갑니다 · 같은 글, 다른 껍데기</p>
          <div className={styles.chips} role="group" aria-label="전환 방식">
            {HOP_STYLES.map((style) => (
              <button key={style.id} type="button" aria-pressed={tuning.hopStyle === style.id} onClick={() => setTuning((current) => ({ ...current, hopStyle: style.id }))}>
                {style.label}
              </button>
            ))}
          </div>
          <Ranges ranges={HOP_RANGES} tuning={tuning} setTuning={setTuning} />
          <button type="button" className={styles.reset} onClick={() => setTuning((current) => ({ ...current, hop: PC_TUNING_DEFAULTS.hop, hopsPerSec: PC_TUNING_DEFAULTS.hopsPerSec, hopStyle: PC_TUNING_DEFAULTS.hopStyle, hopMs: PC_TUNING_DEFAULTS.hopMs }))}>
            기본값으로
          </button>
        </div>
      )}
      {panel === "motion" && (
        <div id="pc-mobiles-motion" className={styles.panel} role="group" aria-label="움직임">
          <p className={styles.heading}>움직임</p>
          <p className={styles.note}>글이 오는 빠르기는 메인 스크린이 정합니다 · 여기서는 폰이 쓰이는 모습 · 갱신/초를 올리면 무거워집니다 (개발 서버, 64대 기준 기본 45)</p>
          <Ranges ranges={PHONE_RANGES} tuning={tuning} setTuning={setTuning} />
          <Ranges ranges={MOTION_RANGES} tuning={tuning} setTuning={setTuning} />
          <button type="button" className={styles.reset} onClick={() => setTuning((current) => ({ ...PC_TUNING_DEFAULTS, hop: current.hop, hopsPerSec: current.hopsPerSec, hopStyle: current.hopStyle, hopMs: current.hopMs }))}>
            기본값으로
          </button>
        </div>
      )}
      <div className={styles.triggers}>
        <button type="button" className={styles.trigger} aria-label="앱 이동 옵션" aria-expanded={panel === "hop"} aria-controls="pc-mobiles-hop" onClick={() => toggle("hop")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="3" y="4" width="6" height="12" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11" y="4" width="6" height="12" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 10h4M10.5 8.5 12 10l-1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className={styles.trigger} aria-label="움직임 옵션" aria-expanded={panel === "motion"} aria-controls="pc-mobiles-motion" onClick={() => toggle("motion")}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M10 3v14M6 7l4-4 4 4M6 13l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
