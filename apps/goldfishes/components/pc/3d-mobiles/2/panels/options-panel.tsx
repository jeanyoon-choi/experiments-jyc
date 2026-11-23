// The one panel, in bubble/9's control language: chips for the choices, sliders for the rest.

import type { Dispatch, SetStateAction } from "react";
import { ARRANGEMENTS, COMMON_CONTROLS, DEFAULTS, FEEDS, FIT_CONTROLS, GROUNDS, HOLDS, INTERFACE_CONTROLS, SCREENS, WALL_CONTROLS, type Control, type Settings } from "../settings";
import { Chip, Chips, Panel, Reset, Section, Slider } from "./controls";

export function OptionsPanel({ settings, setSettings }: { settings: Settings; setSettings: Dispatch<SetStateAction<Settings>> }) {
  const set = (key: keyof Settings, value: number) => setSettings((current) => ({ ...current, [key]: value }));
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
      onChange={(value) => set(control.key, value)}
    />
  );
  /** One of a few: the index of the name pressed. */
  const choice = (key: keyof Settings, label: string, names: readonly string[]) => (
    <Chips label={label}>
      {names.map((name, index) => (
        <Chip key={name} pressed={Math.round(settings[key]) === index} onClick={() => set(key, index)}>
          {name}
        </Chip>
      ))}
    </Chips>
  );
  const arrangement = Math.round(settings.wall);
  const interfaces = Math.round(settings.screens) === 0;
  return (
    <Panel id="options" label="금붕어와 모바일">
      {choice("wall", "배치", ARRANGEMENTS)}
      {choice("screens", "화면", SCREENS)}
      {choice("hold", "금붕어", HOLDS)}
      {choice("ground", "배경", GROUNDS)}
      {arrangement === 1 && (
        <Section id="wall" title="벽" value={`${settings.size} × ${settings.size}`}>
          {WALL_CONTROLS.map(slider)}
        </Section>
      )}
      {arrangement === 2 && (
        <Section id="fit" title="화면 맞춤" value={`${settings.count}대`}>
          {FIT_CONTROLS.map(slider)}
        </Section>
      )}
      <Section id="common" title="금붕어 · 속도">
        {COMMON_CONTROLS.map(slider)}
      </Section>
      {interfaces && (
        <Section id="interface" title="인터페이스" defaultOpen={false}>
          {choice("feed", "피드", FEEDS)}
          {INTERFACE_CONTROLS.map(slider)}
        </Section>
      )}
      <Reset onClick={() => setSettings((current) => ({ ...DEFAULTS, wall: current.wall, screens: current.screens, hold: current.hold, ground: current.ground }))}>기본값으로</Reset>
    </Panel>
  );
}
