import { Fragment, memo } from "react";
import { QUESTIONS, sameSystem, SECTIONS, VERSIONS, type System } from "../rules/versions";
import { Chip, Chips, Note, Panel, Section, Slider } from "../ui/controls";

type Props = { system: System; onSystem: (change: Partial<System>) => void };

/** 시스템: the questions and versions of rules/versions.ts, drawn from its tables. */
export const SystemPanel = memo(function SystemPanel({ system, onSystem }: Props) {
  return (
    <Panel id="system" label="시스템">
      <Note>질문마다 맨 왼쪽이 bubble/9의 방식. 버전은 질문마다 답을 하나씩 고른 한 줄이다.</Note>
      <Chips label="버전">
        {VERSIONS.map((version) => (
          <Chip key={version.id} pressed={sameSystem(system, version.system)} onClick={() => onSystem(version.system)}>
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
                  <Chip key={answer} pressed={Math.round(system[question.key]) === index} onClick={() => onSystem({ [question.key]: index })}>
                    {answer}
                  </Chip>
                ))}
              </Chips>
            </Fragment>
          ))}
          {section.id === "bubble" && system.drift >= 0.5 && (
            <>
              <Note>주사위 대신 판을 움직이는 것: 너무 커진 버블이 지쳐서 터지고 다시 회복하는 순환, 그리고 금붕어.</Note>
              <Slider label="지치기 시작하는 크기 (평균 몫의 몇 배)" output={system.burstAt.toFixed(0)} ariaLabel="버블이 지치기 시작하는 크기" min={5} max={120} step={1} value={system.burstAt} onChange={(burstAt) => onSystem({ burstAt })} />
              <Slider label="회복하는 시간 (초)" output={`${system.recovery.toFixed(0)}초`} ariaLabel="지친 버블이 회복하는 시간" min={2} max={90} step={1} value={system.recovery} onChange={(recovery) => onSystem({ recovery })} />
              <Slider label="금붕어 한 마리의 힘 (0: 무리 전체로 나눔, 1: 한 마리가 그대로)" output={system.perFish.toFixed(2)} ariaLabel="금붕어 한 마리가 품질에 주는 힘" min={0} max={1} step={0.05} value={system.perFish} onChange={(perFish) => onSystem({ perFish })} />
            </>
          )}
          {section.id === "fish" && (
            <Slider label="취향의 세기 (0: 취향 없음, bubble/9)" output={system.taste.toFixed(1)} ariaLabel="금붕어의 취향이 고르는 데 드는 세기" min={0} max={3} step={0.1} value={system.taste} onChange={(taste) => onSystem({ taste })} />
          )}
          {section.id === "stroke" && (
            <Slider label="놓이는 크기 (버블 평균 몫의 몇 배)" output={system.strokeSize.toFixed(1)} ariaLabel="획으로 놓이는 버블의 크기" min={0.5} max={10} step={0.5} value={system.strokeSize} onChange={(strokeSize) => onSystem({ strokeSize })} />
          )}
          {section.id === "stroke" && (
            <Slider label="놓일 때의 매력 (전파의 새 버블은 1.5)" output={system.strokeQuality.toFixed(1)} ariaLabel="획으로 놓이는 버블의 매력" min={0} max={6} step={0.1} value={system.strokeQuality} onChange={(strokeQuality) => onSystem({ strokeQuality })} />
          )}
        </Section>
      ))}
    </Panel>
  );
});
