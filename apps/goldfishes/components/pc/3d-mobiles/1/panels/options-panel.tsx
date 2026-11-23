// The trial's one panel, in bubble/9's control language: chips for the arrangement, sliders for the rest.

import type { Dispatch, SetStateAction } from "react";
import { COMMON_CONTROLS, DEFAULTS, WALL_CONTROLS, type Control, type Settings } from "../settings";
import { Chip, Chips, Panel, Reset, Section, Slider } from "./controls";

export function OptionsPanel({ settings, setSettings }: { settings: Settings; setSettings: Dispatch<SetStateAction<Settings>> }) {
  const slider = (control: Control) => (
    <Slider
      key={control.key}
      label={control.label}
      output={control.key === "size" ? `${settings.size} × ${settings.size}` : settings[control.key].toFixed(control.digits)}
      ariaLabel={control.label}
      min={control.min}
      max={control.max}
      step={control.step}
      value={settings[control.key]}
      onChange={(value) => setSettings((current) => ({ ...current, [control.key]: value }))}
    />
  );
  const wall = settings.wall >= 0.5;
  return (
    <Panel id="options" label="금붕어와 모바일">
      <Chips label="배치">
        <Chip pressed={!wall} onClick={() => setSettings((current) => ({ ...current, wall: 0 }))}>
          한 마리
        </Chip>
        <Chip pressed={wall} onClick={() => setSettings((current) => ({ ...current, wall: 1 }))}>
          벽
        </Chip>
      </Chips>
      {wall && (
        <Section id="wall" title="벽" value={`${settings.size} × ${settings.size}`}>
          {WALL_CONTROLS.map(slider)}
        </Section>
      )}
      <Section id="common" title="금붕어 · 피드">
        {COMMON_CONTROLS.map(slider)}
      </Section>
      <Reset onClick={() => setSettings((current) => ({ ...DEFAULTS, wall: current.wall }))}>기본값으로</Reset>
    </Panel>
  );
}
