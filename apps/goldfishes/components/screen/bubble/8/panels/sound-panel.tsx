import { Fragment, type Dispatch, type SetStateAction } from "react";
import { SOUND_CONTROLS, SOUND_RAW_CONTROLS } from "../settings";
import { SOUND_DEFAULTS, SOUNDSCAPES, type SoundParameters } from "../sound/sound";
import { RAW_GROUPS } from "../sound/sound-raw";
import { REAL_SCAPES } from "../sound/sound-real";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

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

export function SoundPanel({ on, onToggle, sound, setSound }: Props) {
  const raw = sound.version >= 2;
  return (
    <Panel id="sound" label="소리">
      <Note>
        {sound.version === 3
          ? "금붕어가 버블에 닿는 순간마다 · 플랫폼의 실제 알림음 파일 그대로"
          : raw
          ? "금붕어가 버블에 닿는 순간마다 · 플랫폼 알림 하나, 그대로 · 순위가 높을수록 크게, 여러 개 쌓여"
          : "금붕어가 버블에 닿는 순간마다 · 페이지마다 제 음, 순위가 높을수록 낮고 무겁게"}
      </Note>
      <Chips label="소리 켜기">
        <Chip pressed={!on} onClick={() => onToggle(false)}>
          끔
        </Chip>
        <Chip pressed={on} onClick={() => onToggle(true)}>
          켬
        </Chip>
      </Chips>
      <Chips label="버전">
        {VERSIONS.map((version) => (
          <Chip key={version} pressed={sound.version === version} onClick={() => setSound((current) => ({ ...current, version }))}>
            v{version}
          </Chip>
        ))}
      </Chips>
      {raw && (
        <Chips label="겹침">
          {PILES.map((pile) => (
            <Chip key={pile.id} pressed={sound.pile === pile.id} onClick={() => setSound((current) => ({ ...current, pile: pile.id }))}>
              {pile.label}
            </Chip>
          ))}
        </Chips>
      )}
      <Note>소리결</Note>
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
      {(raw ? SOUND_RAW_CONTROLS : SOUND_CONTROLS).map((control) => (
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
