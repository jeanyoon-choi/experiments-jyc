import { Fragment, memo } from "react";
import { RULES, type RuleId } from "../model/agents";
import { QUESTIONS, sameChoices, SECTIONS, VERSIONS } from "../rules/versions";
import type { Model } from "../state/schema";
import { Chip, Chips, Note, OnOff, Panel, Section, Slider } from "../ui/controls";

/** 규칙: the agent model, bubble/9's PageRank as the baseline, then the first attempt's M9 rules (the record). */
const MODELS: readonly { id: Model["id"]; label: string }[] = [
  { id: "에이전트", label: "에이전트" },
  { id: "PR", label: "PageRank (bubble/9)" },
  ...(Object.keys(RULES) as RuleId[]).filter((id) => id !== "에이전트").map((id) => ({ id, label: id })),
];
const SIZE_LABELS = ["절댓값", "제로섬"] as const;
const AUDIENCE_LABELS = ["무리 (bubble/9)", "열린 관객 (M9)"] as const;

type Props = { model: Model; onModel: (change: Partial<Model>) => void };

/**
 * 시스템: which model decides, and under the agent model the questions and versions of rules/versions.ts — drawn from
 * its tables, so a new answer or version needs nothing here.
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
          <Note>질문마다 맨 왼쪽이 bubble/9의 방식. 버전은 질문마다 답을 하나씩 고른 한 줄이다.</Note>
          <Chips label="버전">
            {VERSIONS.map((version) => (
              <Chip key={version.id} pressed={sameChoices(model, version.choices)} onClick={() => onModel(version.choices)}>
                {version.label}
              </Chip>
            ))}
          </Chips>
          {SECTIONS.map((section) => (
            <Section key={section.id} id={`system/${section.id}`} title={section.title}>
              {QUESTIONS.filter((question) => question.section === section.id).map((question) => (
                <Fragment key={question.key}>
                  <Note>{question.label}</Note>
                  <Chips label={question.label}>
                    {question.answers.map((answer, index) => (
                      <Chip key={answer} pressed={Math.round(model[question.key]) === index} onClick={() => onModel({ [question.key]: index })}>
                        {answer}
                      </Chip>
                    ))}
                  </Chips>
                </Fragment>
              ))}
              {section.id === "fish" && model.attach >= 1.5 && (
                <Slider label="질린 오브제를 잊는 시간 (초)" output={`${model.forget.toFixed(0)}초`} ariaLabel="금붕어가 질린 오브제를 잊는 시간" min={2} max={300} step={1} value={model.forget} onChange={(forget) => onModel({ forget })} />
              )}
              {section.id === "fish" && model.attach >= 0.5 && (
                <Slider label="붙는 문턱 (1: 한 마리 몫 버블이 바로 옆에서 끄는 힘)" output={model.worth.toFixed(2)} ariaLabel="금붕어가 버블에 붙는 문턱" min={0.05} max={3} step={0.05} value={model.worth} onChange={(worth) => onModel({ worth })} />
              )}
              {section.id === "bubble" && model.scale >= 0.5 && (
                <Slider label="자라는 시간 (붙은 금붕어 수를 따라가는 데, 초)" output={`${model.grow.toFixed(0)}초`} ariaLabel="라프트가 붙은 금붕어 수를 따라가는 시간" min={1} max={60} step={1} value={model.grow} onChange={(grow) => onModel({ grow })} />
              )}
              {section.id === "stroke" && (
                <Slider label={model.scale >= 0.5 ? "놓이는 크기 (금붕어 몇 마리 몫)" : "놓이는 크기 (제 몫의 몇 배)"} output={model.strokeSize.toFixed(1)} ariaLabel="획으로 놓이는 버블의 크기" min={0.5} max={30} step={0.5} value={model.strokeSize} onChange={(strokeSize) => onModel({ strokeSize })} />
              )}
              {section.id === "stroke" && (
                <Slider label="놓일 때의 매력" output={model.strokeQuality.toFixed(1)} ariaLabel="획으로 놓이는 버블의 매력" min={0} max={8} step={0.1} value={model.strokeQuality} onChange={(strokeQuality) => onModel({ strokeQuality })} />
              )}
            </Section>
          ))}
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
