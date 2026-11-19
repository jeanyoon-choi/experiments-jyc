import { Fragment, memo, type Dispatch, type SetStateAction } from "react";
import { SOUND_CONTROLS, SOUND_RAW_CONTROLS } from "../state/controls";
import { SOUND_DEFAULTS, SOUNDSCAPES, type SoundParameters } from "../sound/sound";
import { RAW_GROUPS, REAL_SCAPES } from "../sound/options";
import { Chip, Chips, ControlSliders, Note, OnOff, Panel, Reset, Section } from "../ui/controls";

type Props = {
  on: boolean;
  onToggle: (on: boolean) => void;
  sound: SoundParameters;
  setSound: Dispatch<SetStateAction<SoundParameters>>;
};

const VERSIONS = [1, 2, 3] as const;
const PILES = [
  { id: "clean", label: "그대로" },
  { id: "brutal", label: "브루털" },
] as const;

/** 소리 (folders, user 2026-11-05): on or off, the version and the volume open; 소리결, then how the sounds pile, ring and break, folded. */
export const SoundPanel = memo(function SoundPanel({ on, onToggle, sound, setSound }: Props) {
  const raw = sound.version >= 2;
  const controls = raw ? SOUND_RAW_CONTROLS : SOUND_CONTROLS;
  const setValue = (key: (typeof controls)[number]["key"], value: number) => setSound((current) => ({ ...current, [key]: value }));
  const scapeLabel =
    sound.version === 3
      ? REAL_SCAPES.find((option) => option.id === sound.real)?.label
      : raw
      ? sound.raw === "mixed"
        ? "섞임"
        : RAW_GROUPS.flatMap((group) => group.kinds).find((option) => option.id === sound.raw)?.label
      : SOUNDSCAPES.find((option) => option.id === sound.scape)?.label;
  return (
    <Panel id="sound" label="소리">
      <Note>
        {sound.version === 3
          ? "금붕어가 버블에 닿는 순간마다 · 플랫폼의 실제 알림음 파일 그대로"
          : raw
          ? "금붕어가 버블에 닿는 순간마다 · 플랫폼 알림 하나, 그대로 · 순위가 높을수록 크게, 여러 개 쌓여"
          : "금붕어가 버블에 닿는 순간마다 · 페이지마다 제 음, 순위가 높을수록 낮고 무겁게"}
      </Note>
      <OnOff label="소리 켜기" value={on} onChange={onToggle} />
      <Chips label="버전">
        {VERSIONS.map((version) => (
          <Chip key={version} pressed={sound.version === version} onClick={() => setSound((current) => ({ ...current, version }))}>
            v{version}
          </Chip>
        ))}
      </Chips>
      <ControlSliders controls={controls.filter((control) => control.key === "volume")} values={sound} onChange={setValue} />
      <Section id="sound/scape" title="소리결" value={scapeLabel} defaultOpen>
        {sound.version === 3 ? (
          <Chips label="소리결">
            {REAL_SCAPES.map((option) => (
              <Chip key={option.id} pressed={sound.real === option.id} onClick={() => setSound((current) => ({ ...current, real: option.id }))}>
                {option.label}
              </Chip>
            ))}
          </Chips>
        ) : raw ? (
          <>
            <Chips label="소리결">
              <Chip pressed={sound.raw === "mixed"} onClick={() => setSound((current) => ({ ...current, raw: "mixed" }))}>
                섞임
              </Chip>
            </Chips>
            {RAW_GROUPS.map((group) => (
              <Fragment key={group.label}>
                <Note>{group.label}</Note>
                <Chips label={group.label}>
                  {group.kinds.map((option) => (
                    <Chip key={option.id} pressed={sound.raw === option.id} onClick={() => setSound((current) => ({ ...current, raw: option.id }))}>
                      {option.label}
                    </Chip>
                  ))}
                </Chips>
              </Fragment>
            ))}
          </>
        ) : (
          <Chips label="소리결">
            {SOUNDSCAPES.map((option) => (
              <Chip key={option.id} pressed={sound.scape === option.id} onClick={() => setSound((current) => ({ ...current, scape: option.id }))}>
                {option.label}
              </Chip>
            ))}
          </Chips>
        )}
      </Section>
      <Section id="sound/shape" title={raw ? "겹침 · 부서짐" : "공간 · 부서짐"}>
        {raw && (
          <Chips label="겹침">
            {PILES.map((pile) => (
              <Chip key={pile.id} pressed={sound.pile === pile.id} onClick={() => setSound((current) => ({ ...current, pile: pile.id }))}>
                {pile.label}
              </Chip>
            ))}
          </Chips>
        )}
        <ControlSliders controls={controls.filter((control) => control.key !== "volume")} values={sound} onChange={setValue} />
      </Section>
      <Reset onClick={() => setSound(SOUND_DEFAULTS)}>기본값으로</Reset>
    </Panel>
  );
});
