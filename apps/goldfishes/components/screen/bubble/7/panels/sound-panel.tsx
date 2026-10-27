import type { Dispatch, SetStateAction } from "react";
import { SOUND_CONTROLS } from "../settings";
import { SOUND_DEFAULTS, SOUNDSCAPES, type SoundParameters } from "../sound/sound";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

type Props = {
  on: boolean;
  onToggle: (on: boolean) => void;
  sound: SoundParameters;
  setSound: Dispatch<SetStateAction<SoundParameters>>;
};

export function SoundPanel({ on, onToggle, sound, setSound }: Props) {
  return (
    <Panel id="sound" label="소리">
      <Note>금붕어가 버블에 닿는 순간마다 · 페이지마다 제 음, 순위가 높을수록 낮고 무겁게</Note>
      <Chips label="소리 켜기">
        <Chip pressed={!on} onClick={() => onToggle(false)}>
          끔
        </Chip>
        <Chip pressed={on} onClick={() => onToggle(true)}>
          켬
        </Chip>
      </Chips>
      <Note>소리결</Note>
      <Chips label="소리결">
        {SOUNDSCAPES.map((option) => (
          <Chip key={option.id} pressed={sound.scape === option.id} onClick={() => setSound((current) => ({ ...current, scape: option.id }))}>
            {option.label}
          </Chip>
        ))}
      </Chips>
      {SOUND_CONTROLS.map((control) => (
        <Slider
          key={control.key}
          label={control.label}
          output={sound[control.key].toFixed(2)}
          ariaLabel={control.label}
          min={control.min}
          max={control.max}
          step={control.step}
          value={sound[control.key]}
          onChange={(value) => setSound((current) => ({ ...current, [control.key]: value }))}
        />
      ))}
      <Reset onClick={() => setSound(SOUND_DEFAULTS)}>기본값으로</Reset>
    </Panel>
  );
}
