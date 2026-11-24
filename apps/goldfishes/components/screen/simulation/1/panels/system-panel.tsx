import { memo } from "react";
import { RULES, type RuleId } from "../model/agents";
import { MODEL_AS_BUBBLE_NINE, MODEL_OPENING, type Model } from "../state/schema";
import { Chip, Chips, Note, OnOff, Panel, Reset, Section, Slider } from "../ui/controls";

/** 규칙: the agent model, bubble/9's PageRank as the baseline, then the first attempt's M9 rules (the record). */
const MODELS: readonly { id: Model["id"]; label: string }[] = [
  { id: "에이전트", label: "에이전트" },
  { id: "PR", label: "PageRank (bubble/9)" },
  ...(Object.keys(RULES) as RuleId[]).filter((id) => id !== "에이전트").map((id) => ({ id, label: id })),
];
const SENDS = ["화면 어디든", "맞닿은 버블만"] as const;
const MEASURES = ["가라앉은 순위", "지금 보이는 크기"] as const;
const SPREADS = ["화면 전체에", "맞닿은 버블에게", "없음"] as const;
const DRIFTS = ["혼자 요동", "금붕어가 볼 때만"] as const;
const ARRIVALS = ["저절로도 생김", "획에서만"] as const;
const CHANGES = ["아무 오브제", "보내온 이웃의 오브제"] as const;
const SIZE_LABELS = ["절댓값", "제로섬"] as const;
const AUDIENCE_LABELS = ["무리 (bubble/9)", "열린 관객 (M9)"] as const;

type Props = { model: Model; onModel: (change: Partial<Model>) => void };

/**
 * 시스템: which model decides, and under the agent model each of the places where bubble/9's decision was made local
 * (simulation/docs/agent-model-proposal.md), one switch each — the left of every pair is bubble/9's way.
 */
export const SystemPanel = memo(function SystemPanel({ model, onModel }: Props) {
  return (
    <Panel id="system" label="시스템">
      <Chips label="규칙">
        {MODELS.map((option) => (
          <Chip key={option.id} pressed={model.id === option.id} onClick={() => onModel({ id: option.id })}>
            {option.label}
          </Chip>
        ))}
      </Chips>
      {model.id === "PR" && <Note>bubble/9 그대로. 아래 옵션은 에이전트 규칙에서만 쓰인다.</Note>}
      {model.id === "에이전트" && (
        <>
          <Note>버블과 금붕어가 눈앞만 보고 정한다. 줄마다 왼쪽이 bubble/9의 방식, 오른쪽이 에이전트의 방식.</Note>
          <Section id="system/bubble" title="버블">
            <Note>방울을 보내는 곳</Note>
            <OnOff label="방울을 보내는 곳" value={model.contacts} labels={SENDS} onChange={(on) => onModel({ contacts: on ? 1 : 0 })} />
            <Note>옆 버블의 매력을 재는 크기</Note>
            <OnOff label="매력을 재는 크기" value={model.visible} labels={MEASURES} onChange={(on) => onModel({ visible: on ? 1 : 0 })} />
            <Note>매 박자 고르게 나눠 주는 15%</Note>
            <Chips label="고르게 나눠 주는 몫">
              {SPREADS.map((label, index) => (
                <Chip key={label} pressed={Math.round(model.spread) === index} onClick={() => onModel({ spread: index })}>
                  {label}
                </Chip>
              ))}
            </Chips>
            <Note>품질 (요동의 세기는 네트워크 → 품질 요동)</Note>
            <OnOff label="품질" value={model.noDrift} labels={DRIFTS} onChange={(on) => onModel({ noDrift: on ? 1 : 0 })} />
            <Note>버블이 바뀔 때 무엇으로</Note>
            <OnOff label="버블이 바뀔 때" value={model.adopt} labels={CHANGES} onChange={(on) => onModel({ adopt: on ? 1 : 0 })} />
          </Section>
          <Section id="system/fish" title="금붕어">
            <Slider label="보는 범위 (0: 화면 전체)" output={model.near.toFixed(2)} ariaLabel="금붕어가 둘러보는 범위, 화면 짧은 변의 몇 배" min={0} max={1} step={0.01} value={model.near} onChange={(near) => onModel({ near })} />
          </Section>
          <Section id="system/stroke" title="관객의 획">
            <Note>새 버블 (저절로 생기는 속도는 네트워크 → 새 페이지)</Note>
            <OnOff label="새 버블" value={model.noArrivals} labels={ARRIVALS} onChange={(on) => onModel({ noArrivals: on ? 1 : 0 })} />
            <Slider label="놓이는 크기 (제 몫의 몇 배)" output={`${model.strokeSize.toFixed(1)}배`} ariaLabel="획으로 놓이는 버블의 크기" min={0} max={30} step={0.5} value={model.strokeSize} onChange={(strokeSize) => onModel({ strokeSize })} />
            <Slider label="놓일 때의 매력" output={model.strokeQuality.toFixed(1)} ariaLabel="획으로 놓이는 버블의 매력" min={0} max={8} step={0.1} value={model.strokeQuality} onChange={(strokeQuality) => onModel({ strokeQuality })} />
          </Section>
          <Reset onClick={() => onModel({ ...MODEL_OPENING, id: "에이전트" })}>에이전트 기본값으로</Reset>
          <Reset onClick={() => onModel(MODEL_AS_BUBBLE_NINE)}>전부 bubble/9 방식으로</Reset>
        </>
      )}
      {model.id !== "PR" && model.id !== "에이전트" && (
        <>
          <Note>첫 시도의 기록: simulation/0의 M9를 그대로 옮긴 것. 받아들여지지 않았다.</Note>
          <OnOff label="버블 크기" value={model.zeroSum} labels={SIZE_LABELS} onChange={(on) => onModel({ zeroSum: on ? 1 : 0 })} />
          <OnOff label="금붕어 수" value={model.open} labels={AUDIENCE_LABELS} onChange={(on) => onModel({ open: on ? 1 : 0 })} />
        </>
      )}
    </Panel>
  );
});
