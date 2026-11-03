import type { Dispatch, SetStateAction } from "react";
import { LIFE_DEFAULTS, type LifeParameters } from "../fish/lifecycle";
import { LIFE_CONTROLS } from "../settings";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

type Props = {
  life: LifeParameters;
  setLife: Dispatch<SetStateAction<LifeParameters>>;
};

export function LifePanel({ life, setLife }: Props) {
  return (
    <Panel id="life" label="생애주기">
      <Note>컨텐츠를 볼수록 기력이 닳고 · 본 구슬의 색으로 물들다 회색이 되어 가라앉고 · 그만큼 사방에서 새로 옵니다</Note>
      <Chips label="생애주기 켜기">
        <Chip pressed={life.enabled < 0.5} onClick={() => setLife((current) => ({ ...current, enabled: 0 }))}>
          끔
        </Chip>
        <Chip pressed={life.enabled >= 0.5} onClick={() => setLife((current) => ({ ...current, enabled: 1 }))}>
          켬
        </Chip>
      </Chips>
      {LIFE_CONTROLS.map((control) => (
        <Slider
          key={control.key}
          label={control.label}
          output={life[control.key].toFixed(control.step < 1 ? 2 : 0)}
          ariaLabel={control.label}
          min={control.min}
          max={control.max}
          step={control.step}
          value={life[control.key]}
          onChange={(value) => setLife((current) => ({ ...current, [control.key]: value }))}
        />
      ))}
      <Reset onClick={() => setLife(LIFE_DEFAULTS)}>기본값으로</Reset>
    </Panel>
  );
}
