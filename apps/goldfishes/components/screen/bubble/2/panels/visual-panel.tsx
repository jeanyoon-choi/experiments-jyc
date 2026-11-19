import type { Dispatch, SetStateAction } from "react";
import styles from "../bubble-three.module.css";
import {
  COATINGS,
  COLOUR_CONTROLS,
  ENVIRONMENTS,
  fromHex,
  KOONS_CONTROLS,
  PRESET_3,
  RAFT_CONTROLS,
  toHex,
  type NumericKey,
  type SliderControl,
  type Visual,
} from "../settings";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

type Props = {
  visual: Visual;
  setVisual: Dispatch<SetStateAction<Visual>>;
};

type NumericControl = SliderControl<Exclude<NumericKey, "envMode">>;

/** The steel's own controls, then the raft's area and flow bubbles, and exposure. */
const SLIDERS: readonly NumericControl[] = [...KOONS_CONTROLS, ...RAFT_CONTROLS];

export function VisualPanel({ visual, setVisual }: Props) {
  const slider = (control: NumericControl) => (
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
      <Note>반사되는 환경</Note>
      <Chips label="반사되는 환경">
        {ENVIRONMENTS.map((option) => (
          <Chip key={option.mode} pressed={visual.envMode === option.mode} onClick={() => setVisual((current) => ({ ...current, envMode: option.mode }))}>
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
      {SLIDERS.map(slider)}
      <Reset
        onClick={() =>
          setVisual((current) => ({
            ...current,
            ...Object.fromEntries(KOONS_CONTROLS.map((control) => [control.key, PRESET_3.visual[control.key]])),
            coating: PRESET_3.visual.coating,
            coatingMix: PRESET_3.visual.coatingMix,
          }))
        }
      >
        쿤스 기본값으로
      </Reset>
    </Panel>
  );
}
