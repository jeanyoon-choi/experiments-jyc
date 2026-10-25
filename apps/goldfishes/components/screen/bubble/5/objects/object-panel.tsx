import type { Dispatch, SetStateAction } from "react";
import { Chip, Chips, Note, Panel, Reset, Slider } from "../panels/controls";
import { OBJECT_CONTROLS, OBJECT_DEFAULTS, OBJECT_KINDS, OBJECT_LABELS, type ObjectControl, type ObjectKind, type ObjectParameters } from "./objects";
import styles from "./objects.module.css";

type Props = {
  objects: ObjectParameters;
  setObjects: Dispatch<SetStateAction<ObjectParameters>>;
};

/** 오브제's panel (its own, user 2026-10-25): bubbles or objects, the portions, size, then each object's 끔/켬 and share. */
export function ObjectPanel({ objects, setObjects }: Props) {
  const slider = (control: ObjectControl) => (
    <Slider
      key={control.key}
      label={control.label}
      output={objects[control.key].toFixed(2)}
      ariaLabel={control.label}
      min={control.min}
      max={control.max}
      step={control.step}
      value={objects[control.key]}
      onChange={(value) => setObjects((current) => ({ ...current, [control.key]: value }))}
    />
  );
  const turn = (kind: ObjectKind, value: number) => setObjects((current) => ({ ...current, [`${kind}On`]: value }));
  return (
    <Panel id="objects" label="오브제">
      <Note>페이지 모양</Note>
      <Chips label="페이지 모양">
        <Chip pressed={objects.shown < 0.5} onClick={() => setObjects((current) => ({ ...current, shown: 0 }))}>
          버블
        </Chip>
        <Chip pressed={objects.shown >= 0.5} onClick={() => setObjects((current) => ({ ...current, shown: 1 }))}>
          오브제
        </Chip>
      </Chips>
      <Note>왔다갔다 하는 것 (링크를 따라 흐르는 몫)</Note>
      <Chips label="왔다갔다 하는 것">
        <Chip pressed={objects.portions < 0.5} onClick={() => setObjects((current) => ({ ...current, portions: 0 }))}>
          버블
        </Chip>
        <Chip pressed={objects.portions >= 0.5} onClick={() => setObjects((current) => ({ ...current, portions: 1 }))}>
          오브제
        </Chip>
      </Chips>
      {OBJECT_CONTROLS.map(slider)}
      {OBJECT_KINDS.map((kind) => (
        <div key={kind} className={styles.kind} role="group" aria-label={OBJECT_LABELS[kind]}>
          <p className={styles.kindHeading}>{OBJECT_LABELS[kind]}</p>
          <Chips label={`${OBJECT_LABELS[kind]} 켜기`}>
            <Chip pressed={objects[`${kind}On`] < 0.5} onClick={() => turn(kind, 0)}>
              끔
            </Chip>
            <Chip pressed={objects[`${kind}On`] >= 0.5} onClick={() => turn(kind, 1)}>
              켬
            </Chip>
          </Chips>
          {slider({ key: kind, label: `${OBJECT_LABELS[kind]} 비중 (얼마나 자주)`, min: 0, max: 1, step: 0.05 })}
        </div>
      ))}
      <Reset onClick={() => setObjects(OBJECT_DEFAULTS)}>오브제 기본값으로</Reset>
    </Panel>
  );
}
