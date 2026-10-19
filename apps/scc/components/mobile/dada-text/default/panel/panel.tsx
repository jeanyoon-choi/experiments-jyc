"use client";

import { useState } from "react";
import { UI } from "../marks";
import { BORDER_MAX, EDGE_MAX, fonts, type Look } from "../drawing/look";
import { commandGroups } from "../words/vocabulary";
import { defaultSettings, type Settings } from "./settings";
import "./panel.css";

/** The option panel: 화면, 명령어, 글꼴, 글자색, 바탕, the two frame sliders and 기본값으로, behind one round trigger. */
export default function Panel({ settings, onChange }: { settings: Settings; onChange: (next: Settings) => void }) {
  const [open, setOpen] = useState(false);
  const { replaced, reach, group, look } = settings;
  const set = (next: Partial<Settings>) => onChange({ ...settings, ...next });
  const setLook = (next: Partial<Look>) => set({ look: { ...look, ...next } });

  return (
    <div {...{ [UI]: "" }} className="dada-text-control">
      {open && (
        <div id="dada-text-options" className="dada-text-panel" role="group" aria-label="치환">
          <p className="dada-text-heading">치환</p>

          <p className="dada-text-note">화면</p>
          <div className="dada-text-chips" role="group" aria-label="화면">
            <button type="button" aria-pressed={!replaced} onClick={() => set({ replaced: false })}>원본</button>
            <button type="button" aria-pressed={replaced && reach === "all"} onClick={() => set({ replaced: true, reach: "all" })}>치환</button>
            <button type="button" aria-pressed={replaced && reach === "content"} onClick={() => set({ replaced: true, reach: "content" })}>콘텐츠만</button>
          </div>

          <p className="dada-text-note">명령어</p>
          <div className="dada-text-chips" role="group" aria-label="명령어">
            {commandGroups.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={group === id} onClick={() => set({ group: id })}>{label}</button>
            ))}
          </div>

          <p className="dada-text-note">글꼴</p>
          <div className="dada-text-chips" role="group" aria-label="글꼴">
            {fonts.map(({ id, label, name, family, weight }) => (
              <button
                key={id}
                type="button"
                aria-pressed={look.font === id}
                aria-label={label}
                style={{ fontFamily: family, fontWeight: weight }}
                onClick={() => setLook({ font: id })}
              >
                {/* Each face is named in itself, so the choice is seen as well as read. */}
                {name}
              </button>
            ))}
          </div>

          <p className="dada-text-note">글자색</p>
          <div className="dada-text-chips" role="group" aria-label="글자색">
            <button type="button" aria-pressed={look.ink === "mono"} onClick={() => setLook({ ink: "mono" })}>먹</button>
            <button type="button" aria-pressed={look.ink === "colour"} onClick={() => setLook({ ink: "colour" })}>대표색</button>
            <button type="button" aria-pressed={look.ink === "random"} onClick={() => setLook({ ink: "random" })}>랜덤</button>
          </div>

          <p className="dada-text-note">바탕</p>
          <div className="dada-text-chips" role="group" aria-label="바탕">
            <button type="button" aria-pressed={!look.dark} onClick={() => setLook({ dark: false })}>흰 바탕</button>
            <button type="button" aria-pressed={look.dark} onClick={() => setLook({ dark: true })}>검은 바탕</button>
          </div>

          <label className="dada-text-slider">
            <span>
              테두리 <output>{look.border === 0 ? "없음" : `${look.border.toFixed(1)} px`}</output>
            </span>
            <input
              type="range"
              min="0"
              max={BORDER_MAX}
              step="0.05"
              value={look.border}
              aria-label="테두리 굵기: 0이면 없음, 1이면 가는 선, 오른쪽으로 갈수록 굵게"
              onChange={(event) => setLook({ border: Number(event.target.value) })}
            />
          </label>

          <label className="dada-text-slider">
            <span>
              바깥 테두리 <output>{!look.edge ? "없음" : `${look.edge} px`}</output>
            </span>
            <input
              type="range"
              min="0"
              max={EDGE_MAX}
              step="1"
              value={look.edge}
              aria-label="바깥 테두리 굵기: 화면 가장자리를 두르는 선, 0이면 없음"
              onChange={(event) => setLook({ edge: Number(event.target.value) })}
            />
          </label>

          <button type="button" className="dada-text-reset" onClick={() => onChange(defaultSettings)}>
            기본값으로
          </button>
        </div>
      )}
      <button
        type="button"
        className="dada-text-trigger"
        aria-label="치환 옵션"
        aria-expanded={open}
        aria-controls="dada-text-options"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <rect x="2.5" y="3.5" width="15" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="2.5" y="11.5" width="9" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="13.5" y="11.5" width="4" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
    </div>
  );
}
