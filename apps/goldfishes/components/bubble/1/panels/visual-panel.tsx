import type { Dispatch, SetStateAction } from "react";
import styles from "../bubble-three.module.css";
import { COLOUR_CONTROLS, ENVIRONMENTS, fromHex, IMAGE_ENVIRONMENT, PALETTES, toHex, VISUAL_CONTROLS, VISUAL_DEFAULTS, type Visual } from "../settings";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

type Props = {
  visual: Visual;
  setVisual: Dispatch<SetStateAction<Visual>>;
  /** The uploaded environment's file name, once there is one. */
  imageName: string | null;
  onImage: (file: File) => void;
};

export function VisualPanel({ visual, setVisual, imageName, onImage }: Props) {
  return (
    <Panel id="visual" label="비주얼">
      <Note>반사되는 환경</Note>
      <Chips label="반사되는 환경">
        {ENVIRONMENTS.map((option) => (
          <Chip key={option.mode} pressed={visual.envMode === option.mode} onClick={() => setVisual((current) => ({ ...current, envMode: option.mode }))}>
            {option.label}
          </Chip>
        ))}
        <label className={styles.file} aria-pressed={visual.envMode === IMAGE_ENVIRONMENT}>
          {imageName ?? "이미지…"}
          <input
            accept="image/*"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImage(file);
            }}
          />
        </label>
      </Chips>
      <Note>팔레트</Note>
      <Chips label="팔레트">
        {PALETTES.map((palette) => (
          <Chip
            key={palette.id}
            pressed={COLOUR_CONTROLS.every(({ key }) => toHex(visual[key]) === palette[key])}
            onClick={() =>
              setVisual((current) => ({
                ...current,
                lightColour: fromHex(palette.lightColour),
                filmTint: fromHex(palette.filmTint),
                background: fromHex(palette.background),
              }))
            }
          >
            {palette.label}
          </Chip>
        ))}
      </Chips>
      <div className={styles.colours}>
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
      {VISUAL_CONTROLS.map((control) => (
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
      ))}
      <Reset onClick={() => setVisual(VISUAL_DEFAULTS)}>bubble/1 값으로</Reset>
    </Panel>
  );
}
