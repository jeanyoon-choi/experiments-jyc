import type { Dispatch, SetStateAction } from "react";
import { LIFE_DEFAULTS, type LifeParameters } from "../fish/lifecycle";
import { LIFE_CONTROLS } from "../state/controls";
import { ControlSliders, DIGITS_BY_UNIT, Note, OnOff, Reset, Section } from "../ui/controls";

type Props = {
  life: LifeParameters;
  setLife: Dispatch<SetStateAction<LifeParameters>>;
};

const TINT_LABELS = ["물듦 끔", "물듦 켬"] as const;

/** 생애주기, folded into the fish panel (user, 2026-11-05: 금붕어 and 수명 in one panel); its 켬 · 끔 shown while folded. */
export function LifeSection({ life, setLife }: Props) {
  return (
    <Section id="fish/life" title="생애주기" value={life.enabled >= 0.5 ? "켬" : "끔"}>
      <Note>컨텐츠를 볼수록 기력이 닳고 · 죽는 순간 회색이 되어 가라앉고 · 그만큼 사방에서 새로 옵니다</Note>
      <OnOff label="생애주기 켜기" value={life.enabled} onChange={(on) => setLife((current) => ({ ...current, enabled: on ? 1 : 0 }))} />
      {/* 색 물듦 (user, 2026-11-07): off by default — a fish keeps its own colour until it dies; on, it takes on the bubbles' it watches. */}
      <OnOff label="본 구슬 색으로 물듦" value={life.tint} labels={TINT_LABELS} onChange={(on) => setLife((current) => ({ ...current, tint: on ? 1 : 0 }))} />
      <ControlSliders
        controls={LIFE_CONTROLS.filter((control) => control.key !== "tintRate" || life.tint >= 0.5)}
        values={life}
        digits={DIGITS_BY_UNIT}
        onChange={(key, value) => setLife((current) => ({ ...current, [key]: value }))}
      />
      <Reset onClick={() => setLife(LIFE_DEFAULTS)}>기본값으로</Reset>
    </Section>
  );
}
