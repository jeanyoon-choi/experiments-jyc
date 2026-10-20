import type { Dispatch, SetStateAction } from "react";
import { FISH_PALETTES, MAX_FISH, type FishPaletteId, type FishParameters } from "../fish/goldfish";
import { FISH_CONTROLS } from "../settings";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

const PALETTE_IDS = Object.keys(FISH_PALETTES) as FishPaletteId[];

type Props = {
  count: number;
  onCount: (count: number) => void;
  fish: FishParameters;
  setFish: Dispatch<SetStateAction<FishParameters>>;
  palette: FishPaletteId;
  onPalette: (palette: FishPaletteId) => void;
  influence: number;
  onInfluence: (influence: number) => void;
  /** 기본값으로 (black) or 기본값 2 (grey). */
  onDefaults: (second: boolean) => void;
  /** 기본값 3: every panel back to the set this experiment opens with. */
  onPreset3: () => void;
};

export function FishPanel({ count, onCount, fish, setFish, palette, onPalette, influence, onInfluence, onDefaults, onPreset3 }: Props) {
  return (
    <Panel id="fish" label="금붕어">
      <Note>버블 가장자리를 오가며 링크를 따라 옮겨 다니고, 오래 머문 페이지의 품질을 올립니다</Note>
      <Slider label="수" output={count} ariaLabel="금붕어 수; 0이면 없음" min={0} max={MAX_FISH} step={10} value={count} onChange={onCount} />
      <Note>색</Note>
      <Chips label="금붕어 색">
        {PALETTE_IDS.map((id) => (
          <Chip key={id} pressed={palette === id} onClick={() => onPalette(id)}>
            {FISH_PALETTES[id].label}
          </Chip>
        ))}
      </Chips>
      {FISH_CONTROLS.map((control) => (
        <Slider
          key={control.key}
          label={control.label}
          output={fish[control.key].toFixed(2)}
          ariaLabel={control.label}
          min={control.min}
          max={control.max}
          step={control.step}
          value={fish[control.key]}
          onChange={(value) => setFish((current) => ({ ...current, [control.key]: value }))}
        />
      ))}
      <Slider
        label="품질에 주는 영향"
        output={influence.toFixed(2)}
        ariaLabel="금붕어가 머문 페이지의 품질을 올리는 정도"
        min={0}
        max={1}
        step={0.01}
        value={influence}
        onChange={onInfluence}
      />
      <Reset onClick={() => onDefaults(false)}>기본값으로</Reset>
      <Reset onClick={() => onDefaults(true)}>기본값 2</Reset>
      <Reset onClick={onPreset3}>기본값 3</Reset>
    </Panel>
  );
}
