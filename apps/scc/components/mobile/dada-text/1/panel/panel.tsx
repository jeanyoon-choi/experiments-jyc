"use client";

import { useState } from "react";
import { UI } from "../marks";
import { BORDER_MAX, EDGE_MAX, fonts, type Look } from "../drawing/look";
import { TECH_HYPE } from "../words/sequence";
import { commandGroups } from "../words/vocabulary";
import { defaultSettings, PICTURE_EVERY_MAX, type Settings } from "./settings";
import "./panel.css";

/** The option panel: 명령어 (with 하이프's 텍스트: 섞기 or one word), 사진 (있음 with its 빈도, 없음, 자율), 글꼴, 글자색, the two frame sliders and 기본값으로, behind one round trigger. */
export default function Panel({ settings, onChange }: { settings: Settings; onChange: (next: Settings) => void }) {
  const [open, setOpen] = useState(false);
  const { dealt, hype, group, pictures, pictureEvery, look } = settings;
  const set = (next: Partial<Settings>) => onChange({ ...settings, ...next });
  const setLook = (next: Partial<Look>) => set({ look: { ...look, ...next } });

  return (
    <div {...{ [UI]: "" }} className="dada-text-control">
      {open && (
        <div id="dada-text-options" className="dada-text-panel" role="group" aria-label="치환">
          <p className="dada-text-heading">치환</p>

          <p className="dada-text-note">명령어</p>
          <div className="dada-text-chips" role="group" aria-label="명령어">
            <button type="button" aria-pressed={dealt} onClick={() => set({ dealt: true })}>하이프</button>
            {commandGroups.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={!dealt && group === id} onClick={() => set({ dealt: false, group: id })}>{label}</button>
            ))}
          </div>

          {dealt && (
            <>
              <p className="dada-text-note">텍스트</p>
              <div className="dada-text-chips" role="group" aria-label="텍스트">
                <button type="button" aria-pressed={hype === null} onClick={() => set({ hype: null })}>섞기</button>
                {TECH_HYPE.map((word) => (
                  <button key={word} type="button" aria-pressed={hype === word} onClick={() => set({ hype: word })}>{word}</button>
                ))}
              </div>
            </>
          )}

          <p className="dada-text-note">사진</p>
          <div className="dada-text-chips" role="group" aria-label="사진">
            <button type="button" aria-pressed={pictures === "on"} onClick={() => set({ pictures: "on" })}>있음</button>
            <button type="button" aria-pressed={pictures === "off"} onClick={() => set({ pictures: "off" })}>없음</button>
            <button type="button" aria-pressed={pictures === "auto"} onClick={() => set({ pictures: "auto" })}>자율</button>
          </div>

          {pictures === "on" && (
            <label className="dada-text-slider">
              <span>
                사진 빈도 <output>{pictureEvery}칸마다</output>
              </span>
              {/* Right is more often: the slider runs from one picture after every 12 tiles to one after every tile. */}
              <input
                type="range"
                min="1"
                max={PICTURE_EVERY_MAX}
                step="1"
                value={PICTURE_EVERY_MAX + 1 - pictureEvery}
                aria-label={`사진 빈도: 글자 칸 ${pictureEvery}개마다 사진 하나, 오른쪽으로 갈수록 자주`}
                onChange={(event) => set({ pictureEvery: PICTURE_EVERY_MAX + 1 - Number(event.target.value) })}
              />
            </label>
          )}

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

          <label className="dada-text-slider">
            <span>
              테두리 <output>{look.border === 0 ? "없음" : `${look.border.toFixed(2)} px`}</output>
            </span>
            <input
              type="range"
              min="0"
              max={BORDER_MAX}
              step="0.05"
              value={look.border}
              aria-label="테두리 굵기: 0이면 없음, 1 px까지"
              onChange={(event) => setLook({ border: Number(event.target.value) })}
            />
          </label>

          <label className="dada-text-slider">
            <span>
              바깥 테두리 <output>{!look.edge ? "없음" : `${look.edge.toFixed(2)} px`}</output>
            </span>
            <input
              type="range"
              min="0"
              max={EDGE_MAX}
              step="0.05"
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
