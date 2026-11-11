import type { Dispatch, SetStateAction } from "react";
import styles from "../bubble-three.module.css";
import {
  coatChosenOf,
  COLOUR_CONTROLS,
  fromHex,
  FAMILY_OPENING,
  familyOf,
  LOOK_FAMILIES,
  LOOKS,
  PHOTO_ROOMS,
  LOOK_BASE,
  PRESET_3,
  SLIDER_GROUPS,
  toHex,
  type SliderControl,
  type NumericKey,
  type Visual,
} from "../settings";
import { materialOf } from "../render/materials";
import { Chip, Chips, Note, Panel, Reset, Section, Slider } from "./controls";
import { Fragment, useState } from "react";
import { hsl, hslOf } from "../render/materials/coats";
import folds from "./panels.module.css";

type Props = {
  visual: Visual;
  setVisual: Dispatch<SetStateAction<Visual>>;
  /** Saves every panel's current values as a JSON file (a look to add as a 연출 button). */
  onExport: () => void;
};

/**
 * The coat by HSL (user, 2026-11-06: no named palettes): 색상, 채도 and 명도 sliders, and 섞음 (each sphere and object
 * its own, render/materials/coats.ts). Moving a slider picks one colour for all; the hue is kept while the colour is grey.
 */
function HslCoat({ visual, setVisual }: { visual: Visual; setVisual: Dispatch<SetStateAction<Visual>> }) {
  const [h, sat, light] = hslOf(visual.coating);
  const [kept, setKept] = useState(h);
  const hue = sat > 0.001 && light > 0.001 && light < 0.999 ? h : kept;
  const set = (next: [number, number, number]) =>
    setVisual((current) => ({ ...current, ...coatChosenOf(current.material), coatingMix: 0, coating: [...hsl(...next)] as Visual["coating"] }));
  const mixed = visual.coatingMix === 1;
  return (
    <>
      <Chips label="섞음">
        <Chip pressed={mixed} onClick={() => setVisual((current) => ({ ...current, ...coatChosenOf(current.material), coatingMix: mixed ? 0 : 1 }))}>
          섞음
        </Chip>
      </Chips>
      <div className={folds.hsl}>
        <label title={`${Math.round(hue)}°`}>
          H
          <input aria-label="H" type="range" min={0} max={360} step={1} value={Math.round(hue)} onChange={(event) => { const value = Number(event.target.value); setKept(value); set([value, sat, light]); }} />
        </label>
        <label title={`${Math.round(sat * 100)}%`}>
          S
          <input aria-label="S" type="range" min={0} max={100} step={1} value={Math.round(sat * 100)} onChange={(event) => set([hue, Number(event.target.value) / 100, light])} />
        </label>
        <label title={`${Math.round(light * 100)}%`}>
          L
          <input aria-label="L" type="range" min={0} max={100} step={1} value={Math.round(light * 100)} onChange={(event) => set([hue, sat, Number(event.target.value) / 100])} />
        </label>
      </div>
    </>
  );
}

/** The look a 연출 button gives: the opening values, then its own. The raft's area and flow stay unless the look sets them. */
function withLook(current: Visual, look: Partial<Visual>): Visual {
  // A material's own choices (인쇄물's 방향) stay as they are set: they run beside the 연출, not under it.
  const choices = materialOf(look.material ?? LOOK_BASE.material)?.choices ?? [];
  const kept = Object.fromEntries(choices.map((choice) => [choice.key, (current as Record<string, unknown>)[choice.key]]).filter(([, value]) => value !== undefined));
  return { ...LOOK_BASE, area: current.area, portions: current.portions, flow: current.flow ?? 1, ...look, ...kept };
}

function sameLook(visual: Visual, look: Partial<Visual>) {
  const target = withLook(visual, look);
  return (Object.keys(target) as (keyof Visual)[]).every((key) => {
    // A uniform added while the page was open has no value in its state yet: its default stands in (as the sliders do).
    const a = visual[key] ?? LOOK_BASE[key];
    const b = target[key] ?? LOOK_BASE[key];
    return typeof a === "number" ? a === b : toHex(a) === toHex(b as typeof a);
  });
}

/** 비주얼 (folders, user 2026-11-05): 재질, 연출 and 환경 open; the colours and each group of sliders folded. */
export function VisualPanel({ visual, setVisual, onExport }: Props) {
  const family = familyOf(visual);
  const colourLabel = materialOf(visual.material)?.colourLabel ?? "코팅";
  const slider = (control: SliderControl<NumericKey>) => (
    <Slider
      key={control.key}
      label={control.label}
      output={(visual[control.key] ?? LOOK_BASE[control.key]).toFixed(control.step < 1 ? 2 : 0)}
      ariaLabel={control.label}
      min={control.min}
      max={control.max}
      step={control.step}
      // A material added while a page was open has no value in its state yet: its default stands in.
      value={visual[control.key] ?? LOOK_BASE[control.key]}
      onChange={(value) => setVisual((current) => ({ ...current, [control.key]: value }))}
    />
  );
  return (
    <Panel id="visual" label="비주얼">
      {/* 재질 first (user, 2026-11-03): 액체 or 쿤스. Everything below is that material's: its 연출, its colour, its
          sliders; switching opens the material on its first 연출. */}
      <Note>재질</Note>
      <Chips label="재질">
        {LOOK_FAMILIES.map((option) => (
          <Chip
            key={option.id}
            pressed={family === option.id}
            onClick={() => {
              if (family !== option.id) setVisual((current) => withLook(current, FAMILY_OPENING[option.id]));
            }}
          >
            {option.label}
          </Chip>
        ))}
      </Chips>
      <Note>연출</Note>
      <Chips label="연출">
        {LOOKS.filter((option) => option.family === family).map((option) => (
          <Chip key={option.id} pressed={sameLook(visual, option.look)} onClick={() => setVisual((current) => withLook(current, option.look))}>
            {option.label}
          </Chip>
        ))}
      </Chips>
      {(materialOf(visual.material)?.choices ?? []).map((choice) => (
        <Fragment key={choice.key}>
          <Note>{choice.label}</Note>
          <Chips label={choice.label}>
            {choice.options.map((option) => (
              <Chip
                key={option.value}
                pressed={Math.round(Number((visual as Record<string, unknown>)[choice.key] ?? 0)) === option.value}
                onClick={() => setVisual((current) => ({ ...current, [choice.key]: option.value }))}
              >
                {option.label}
              </Chip>
            ))}
          </Chips>
        </Fragment>
      ))}
      <Note>환경</Note>
      <Chips label="환경">
        <Chip pressed={visual.photoStrength === 0} onClick={() => setVisual((current) => ({ ...current, photoStrength: 0 }))}>
          없음
        </Chip>
        {PHOTO_ROOMS.map((option) => (
          <Chip
            key={option.mode}
            pressed={visual.photoStrength > 0 && visual.photo === option.mode}
            onClick={() => setVisual((current) => ({ ...current, photo: option.mode, photoStrength: current.photoStrength > 0 ? current.photoStrength : 1 }))}
          >
            {option.label}
          </Chip>
        ))}
      </Chips>
      <Section id="visual/colour" title="색">
        <Note>{colourLabel === "코팅" ? "코팅" : `${colourLabel} 색`}</Note>
        <HslCoat visual={visual} setVisual={setVisual} />
        <div className={styles.colours}>
          <label>
            <input
              aria-label="코팅 색"
              type="color"
              value={toHex(visual.coating)}
              onChange={(event) => {
                const coating = fromHex(event.target.value);
                setVisual((current) => ({ ...current, ...coatChosenOf(current.material), coating, coatingMix: 0 }));
              }}
            />
            {colourLabel}
          </label>
          {COLOUR_CONTROLS.map((control) => (
            <label key={control.key}>
              <input
                aria-label={`${control.label} 색`}
                type="color"
                value={toHex(visual[control.key])}
                onChange={(event) => {
                  const colour = fromHex(event.target.value);
                  setVisual((current) => ({ ...current, [control.key]: colour }));
                }}
              />
              {control.label}
            </label>
          ))}
        </div>
      </Section>
      {/* The coat's sliders under the coat, each material's under it; the rest always: each group its own fold. */}
      {SLIDER_GROUPS.filter((group) => group.material === undefined || (group.material === "koons" ? visual.material === 0 : group.material === visual.material)).map((group) => (
        <Section key={group.title} id={`visual/${group.title}`} title={group.title}>
          {group.controls.map(slider)}
        </Section>
      ))}
      <Reset onClick={() => setVisual(PRESET_3.visual)}>처음 값으로</Reset>
      <Reset onClick={onExport}>JSON 내려받기</Reset>
    </Panel>
  );
}
