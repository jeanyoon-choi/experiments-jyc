import { memo, type Dispatch, type SetStateAction } from "react";
import { FISH_PALETTES, MAX_FISH, type FishPaletteId, type FishParameters } from "../fish/goldfish";
import type { LifeParameters } from "../fish/lifecycle";
import { FEEDBACK_CONTROLS, FISH_CONTROLS } from "../state/controls";
import type { Feedback } from "../state/schema";
import { Chip, Chips, ControlSliders, Note, Panel, Reset, Section, Slider } from "../ui/controls";
import { LifeSection } from "./life-section";

const PALETTE_IDS = Object.keys(FISH_PALETTES) as FishPaletteId[];

type Props = {
  count: number;
  onCount: (count: number) => void;
  fish: FishParameters;
  setFish: Dispatch<SetStateAction<FishParameters>>;
  palette: FishPaletteId;
  onPalette: (palette: FishPaletteId) => void;
  /** How the school's watching feeds back into page quality. */
  feedback: Feedback;
  setFeedback: Dispatch<SetStateAction<Feedback>>;
  /** 생애주기 (its own panel until 2026-11-05). */
  life: LifeParameters;
  setLife: Dispatch<SetStateAction<LifeParameters>>;
  /** 기본값으로 (black) or 기본값 2 (grey). */
  onDefaults: (second: boolean) => void;
  /** 기본값 3: every panel back to the set this experiment opens with. */
  onOpening: () => void;
};

/**
 * 금붕어's panel (folders, user 2026-11-05): how many and their colour open; how they swim, their life, what their
 * watching does to the web folded away, one under another.
 */
export const FishPanel = memo(function FishPanel({ count, onCount, fish, setFish, palette, onPalette, feedback, setFeedback, life, setLife, onDefaults, onOpening }: Props) {
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
      <Section id="fish/swim" title="헤엄 · 주의">
        <ControlSliders controls={FISH_CONTROLS} values={fish} onChange={(key, value) => setFish((current) => ({ ...current, [key]: value }))} />
      </Section>
      <LifeSection life={life} setLife={setLife} />
      <Section id="fish/feedback" title="웹에 주는 영향">
        <ControlSliders controls={FEEDBACK_CONTROLS} values={feedback} onChange={(key, value) => setFeedback((current) => ({ ...current, [key]: value }))} />
      </Section>
      <Reset onClick={() => onDefaults(false)}>기본값으로</Reset>
      <Reset onClick={() => onDefaults(true)}>기본값 2</Reset>
      <Reset onClick={onOpening}>기본값 3</Reset>
    </Panel>
  );
});
