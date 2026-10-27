// bubble/7's modes, at the bottom left (user, 2026-10-27): 군집 (the raft, as
// bubble/6), 전파 (the raft, strains of colour and object spreading through it)
// and 랩 (one object at a time, to tune the liquid morph and the material).
// Each mode's own settings fold out above the switch; the liquid's are the
// objects' (objects.ts), so whatever is tuned in the 랩 is what the raft does.

import { useState, type Dispatch, type SetStateAction } from "react";
import base from "../bubble-three.module.css";
import { Chip, Chips, Note, Reset, Slider } from "./controls";
import { LAB_DEFAULTS, type LabSettings } from "../objects/lab";
import { LIQUID_CONTROLS, LIQUID_DEFAULTS, type LiquidControl } from "../objects/liquid";
import { FIELD_KINDS, LAB_SEQUENCE_LABELS, LAB_SEQUENCES } from "../objects/morph";
import { OBJECT_LABELS, type ObjectKind, type ObjectParameters } from "../objects/objects";
import { SPREAD_CONTROLS, SPREAD_DEFAULTS, SPREAD_ROUTE_LABELS, SPREAD_ROUTES, STRAINS, type SpreadControl, type SpreadParameters } from "../spread/contagion";
import styles from "./mode-control.module.css";

export type Mode = "raft" | "spread" | "lab";

const MODES: readonly { id: Mode; label: string }[] = [
  { id: "raft", label: "군집" },
  { id: "spread", label: "전파" },
  { id: "lab", label: "랩" },
];

const kindLabel = (kind: string) => (kind === "bubble" ? "버블" : (OBJECT_LABELS[kind as ObjectKind] ?? kind));

type Props = {
  mode: Mode;
  onMode: (mode: Mode) => void;
  objects: ObjectParameters;
  setObjects: Dispatch<SetStateAction<ObjectParameters>>;
  lab: LabSettings;
  setLab: Dispatch<SetStateAction<LabSettings>>;
  /** The 랩's morph under way (field kinds). */
  labMorph: { from: string; to: string };
  spread: SpreadParameters;
  setSpread: Dispatch<SetStateAction<SpreadParameters>>;
};

const STRAIN_NAMES = ["분홍", "청록", "형광 노랑", "파랑", "주황"] as const;
const css = (colour: readonly [number, number, number]) => `rgb(${colour.map((value) => Math.round(value * 255)).join(",")})`;

export function ModeControl({ mode, onMode, objects, setObjects, lab, setLab, labMorph, spread, setSpread }: Props) {
  const [open, setOpen] = useState(true);
  const liquidSlider = (control: LiquidControl) => (
    <Slider
      key={control.key}
      label={control.label}
      output={objects[control.key].toFixed(control.step < 0.01 ? 3 : 2)}
      ariaLabel={control.label}
      min={control.min}
      max={control.max}
      step={control.step}
      value={objects[control.key]}
      onChange={(value) => setObjects((current) => ({ ...current, [control.key]: value }))}
    />
  );
  const spreadSlider = (control: SpreadControl) => (
    <Slider
      key={control.key}
      label={control.label}
      output={spread[control.key].toFixed(control.step < 1 ? 2 : 0)}
      ariaLabel={control.label}
      min={control.min}
      max={control.max}
      step={control.step}
      value={spread[control.key]}
      onChange={(value) => setSpread((current) => ({ ...current, [control.key]: value }))}
    />
  );
  const hasPanel = mode !== "raft";
  return (
    <div className={styles.modes}>
      {hasPanel && open && mode === "lab" && (
        <div id="bubble-seven-mode" className={base.panel} role="group" aria-label="랩">
          <p className={base.heading}>랩 · 오브제 하나씩</p>
          <Note>
            지금 {kindLabel(labMorph.from)} → {kindLabel(labMorph.to)} · 화면을 누르면 다음으로
          </Note>
          <Chips label="모핑할 형태">
            {FIELD_KINDS.map((kind) => (
              <Chip key={kind} pressed={labMorph.to === kind} onClick={() => setLab((current) => ({ ...current, target: kind, pick: current.pick + 1 }))}>
                {kindLabel(kind)}
              </Chip>
            ))}
          </Chips>
          <Note>순서</Note>
          <Chips label="순서">
            {LAB_SEQUENCES.map((sequence) => (
              <Chip key={sequence} pressed={lab.sequence === sequence} onClick={() => setLab((current) => ({ ...current, sequence }))}>
                {LAB_SEQUENCE_LABELS[sequence]}
              </Chip>
            ))}
          </Chips>
          <Chips label="넘김">
            <Chip pressed={lab.auto >= 0.5} onClick={() => setLab((current) => ({ ...current, auto: current.auto >= 0.5 ? 0 : 1 }))}>
              자동 넘김
            </Chip>
            <Chip pressed={lab.all >= 0.5} onClick={() => setLab((current) => ({ ...current, all: current.all >= 0.5 ? 0 : 1 }))}>
              꺼진 오브제도
            </Chip>
            <Chip pressed={lab.scrub >= 0} onClick={() => setLab((current) => ({ ...current, scrub: current.scrub >= 0 ? -1 : 0.4 }))}>
              한 순간 멈춤
            </Chip>
          </Chips>
          {lab.scrub >= 0 && (
            <Slider label="모핑 진행" output={lab.scrub.toFixed(2)} ariaLabel="모핑 진행" min={0} max={1} step={0.005} value={lab.scrub} onChange={(value) => setLab((current) => ({ ...current, scrub: value }))} />
          )}
          <Slider label="머무는 시간 (초)" output={lab.hold.toFixed(1)} ariaLabel="머무는 시간" min={0} max={8} step={0.1} value={lab.hold} onChange={(value) => setLab((current) => ({ ...current, hold: value }))} />
          <Slider label="크기" output={lab.scale.toFixed(2)} ariaLabel="크기" min={0.3} max={1.6} step={0.01} value={lab.scale} onChange={(value) => setLab((current) => ({ ...current, scale: value }))} />
          <Slider label="회전" output={`${Math.round((lab.turn * 180) / Math.PI)}°`} ariaLabel="회전" min={-Math.PI} max={Math.PI} step={0.01} value={lab.turn} onChange={(value) => setLab((current) => ({ ...current, turn: value }))} />
          <Note>액체 (군집에도 그대로)</Note>
          {LIQUID_CONTROLS.map(liquidSlider)}
          <Reset
            onClick={() => {
              setObjects((current) => ({ ...current, ...LIQUID_DEFAULTS }));
              setLab((current) => ({ ...LAB_DEFAULTS, target: current.target, pick: current.pick, step: current.step }));
            }}
          >
            랩 · 액체 기본값으로
          </Reset>
        </div>
      )}
      {hasPanel && open && mode === "spread" && (
        <div id="bubble-seven-mode" className={base.panel} role="group" aria-label="전파">
          <p className={base.heading}>전파 · 색과 형태의 전염</p>
          <Note>① 색 → ② 오브제를 고르고 ③ 화면을 누르면 그 자리에, 누른 채 그으면 지나간 길을 따라 줄줄이 들어와 (손가락 여럿도), 맞닿은 (또는 링크된) 버블로 그 색이 번진다</Note>
          <div className={styles.strains} role="group" aria-label="① 색">
            {STRAINS.map((colour, index) => (
              <button
                key={STRAIN_NAMES[index]}
                type="button"
                className={styles.strain}
                style={{ background: css(colour) }}
                aria-pressed={Math.round(spread.strain) === index}
                aria-label={STRAIN_NAMES[index]}
                onClick={() => setSpread((current) => ({ ...current, strain: index }))}
              />
            ))}
          </div>
          <Chips label="② 오브제">
            {FIELD_KINDS.map((kind) => (
              <Chip key={kind} pressed={spread.pick === kind} onClick={() => setSpread((current) => ({ ...current, pick: kind }))}>
                {kindLabel(kind)}
              </Chip>
            ))}
          </Chips>
          <p className={styles.armed} style={{ borderColor: css(STRAINS[Math.round(spread.strain)] ?? STRAINS[0]!) }}>
            <span style={{ background: css(STRAINS[Math.round(spread.strain)] ?? STRAINS[0]!) }} aria-hidden="true" />③ 누르거나 그으면 {STRAIN_NAMES[Math.round(spread.strain)]} {kindLabel(spread.pick)}
          </p>
          <Note>경로</Note>
          <Chips label="경로">
            {SPREAD_ROUTES.map((route, index) => (
              <Chip key={route} pressed={Math.round(spread.route) === index} onClick={() => setSpread((current) => ({ ...current, route: index }))}>
                {SPREAD_ROUTE_LABELS[route]}
              </Chip>
            ))}
          </Chips>
          <Chips label="모양도 전파">
            <Chip pressed={spread.shape >= 0.5} onClick={() => setSpread((current) => ({ ...current, shape: current.shape >= 0.5 ? 0 : 1 }))}>
              모양도 전파
            </Chip>
          </Chips>
          {SPREAD_CONTROLS.map(spreadSlider)}
          <Reset onClick={() => setSpread(SPREAD_DEFAULTS)}>전파 기본값으로</Reset>
        </div>
      )}
      <div className={styles.switch} role="group" aria-label="모드">
        {MODES.map((option) => (
          <button key={option.id} type="button" aria-pressed={mode === option.id} onClick={() => onMode(option.id)}>
            {option.label}
          </button>
        ))}
        {hasPanel && (
          <button type="button" className={styles.fold} aria-expanded={open} aria-controls="bubble-seven-mode" aria-label={open ? "설정 접기" : "설정 펼치기"} onClick={() => setOpen((current) => !current)}>
            {open ? "−" : "+"}
          </button>
        )}
      </div>
    </div>
  );
}
