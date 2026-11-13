import type { Dispatch, SetStateAction } from "react";
import styles from "../bubble-three.module.css";
import {
  COATINGS,
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
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

type Props = {
  visual: Visual;
  setVisual: Dispatch<SetStateAction<Visual>>;
  /** Saves every panel's current values as a JSON file (a look to add as a 연출 button). */
  onExport: () => void;
};

/** The look a 연출 button gives: the opening values, then its own. The raft's area and flow stay unless the look sets them. */
function withLook(current: Visual, look: Partial<Visual>): Visual {
  return { ...LOOK_BASE, area: current.area, portions: current.portions, ...look };
}

function sameLook(visual: Visual, look: Partial<Visual>) {
  const target = withLook(visual, look);
  return (Object.keys(target) as (keyof Visual)[]).every((key) => {
    const a = visual[key];
    const b = target[key];
    return typeof a === "number" ? a === b : toHex(a) === toHex(b as typeof a);
  });
}

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
      <Note>{colourLabel === "코팅" ? "코팅" : `${colourLabel} 색`}</Note>
      <Chips label="코팅">
        {COATINGS.map((option) => (
          <Chip
            key={option.id}
            pressed={option.colour === null ? visual.coatingMix === 1 : visual.coatingMix === 0 && toHex(visual.coating) === toHex(option.colour)}
            onClick={() =>
              setVisual((current) => (option.colour === null ? { ...current, coatingMix: 1 } : { ...current, coatingMix: 0, coating: option.colour }))
            }
          >
            {option.label}
          </Chip>
        ))}
      </Chips>
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
      <div className={styles.colours}>
        <label>
          <input
            aria-label="코팅 색"
            type="color"
            value={toHex(visual.coating)}
            onChange={(event) => {
              const coating = fromHex(event.target.value);
              setVisual((current) => ({ ...current, coating, coatingMix: 0 }));
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
      {/* The coat's sliders under the coat, each material's under it; the rest always. */}
      {SLIDER_GROUPS.filter((group) => group.material === undefined || (group.material === "koons" ? visual.material === 0 : group.material === visual.material)).map((group) => (
        <div key={group.title}>
          <Note>{group.title}</Note>
          {group.controls.map(slider)}
        </div>
      ))}
      <Reset onClick={() => setVisual(PRESET_3.visual)}>처음 값으로</Reset>
      <Reset onClick={onExport}>JSON 내려받기</Reset>
    </Panel>
  );
}
