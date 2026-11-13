import type { Dispatch, SetStateAction } from "react";
import styles from "../bubble-three.module.css";
import {
  COATINGS,
  COLOUR_CONTROLS,
  fromHex,
  LOOKS,
  PHOTO_ROOMS,
  PRESET_3,
  SLIDER_GROUPS,
  toHex,
  type SliderControl,
  type NumericKey,
  type Visual,
} from "../settings";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

type Props = {
  visual: Visual;
  setVisual: Dispatch<SetStateAction<Visual>>;
  /** Saves every panel's current values as a JSON file (a look to add as a 연출 button). */
  onExport: () => void;
};

/** The look a 연출 button gives: the opening values, then its own. The raft's area and flow stay unless the look sets them. */
function withLook(current: Visual, look: Partial<Visual>): Visual {
  return { ...PRESET_3.visual, area: current.area, portions: current.portions, ...look };
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
  const slider = (control: SliderControl<NumericKey>) => (
    <Slider
      key={control.key}
      label={control.label}
      output={visual[control.key].toFixed(control.step < 1 ? 2 : 0)}
      ariaLabel={control.label}
      min={control.min}
      max={control.max}
      step={control.step}
      value={visual[control.key]}
      onChange={(value) => setVisual((current) => ({ ...current, [control.key]: value }))}
    />
  );
  return (
    <Panel id="visual" label="비주얼">
      <Note>연출</Note>
      <Chips label="연출">
        {LOOKS.map((option) => (
          <Chip key={option.id} pressed={sameLook(visual, option.look)} onClick={() => setVisual((current) => withLook(current, option.look))}>
            {option.label}
          </Chip>
        ))}
      </Chips>
      <Note>코팅</Note>
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
          코팅
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
      {SLIDER_GROUPS.map((group) => (
        <div key={group.title}>
          <Note>{group.title}</Note>
          {group.controls.map(slider)}
        </div>
      ))}
      <Reset onClick={() => setVisual((current) => withLook(current, {}))}>처음 값으로</Reset>
      <Reset onClick={onExport}>JSON 내려받기</Reset>
    </Panel>
  );
}
