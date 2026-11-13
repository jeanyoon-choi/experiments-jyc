import type { Dispatch, SetStateAction } from "react";
import { Chip, Chips, Note, Panel, Reset, Slider } from "../panels/controls";
import {
  OBJECT_CONTROLS,
  OBJECT_DEFAULTS,
  OBJECT_LABELS,
  OBJECT_GROUPS,
  KINDS_OF,
  GROUPS,
  FACING_LABELS,
  FACINGS,
  hasGroup,
  PORTION_SHOWS,
  SHOW_LABELS,
  toggledGroup,
  type ObjectControl,
  type ObjectParameters,
} from "./objects";
import styles from "./objects.module.css";

type Props = {
  objects: ObjectParameters;
  setObjects: Dispatch<SetStateAction<ObjectParameters>>;
};

/**
 * 오브제's panel: what the pages and the portions under way are shown as,
 * size and puff; each group's kinds folded away, one chip each (pressed: on).
 */
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
  return (
    <Panel id="objects" label="오브제">
      {/* 페이지, AND not OR (user, 2026-11-03): any combination of the groups, mixed; 버블 clears them. */}
      <Note>페이지</Note>
      <Chips label="페이지">
        <Chip pressed={Math.round(objects.pages) === 0} onClick={() => setObjects((current) => ({ ...current, pages: 0 }))}>
          {SHOW_LABELS.bubble}
        </Chip>
        {GROUPS.map((group) => (
          <Chip key={group} pressed={hasGroup(objects.pages, group)} onClick={() => setObjects((current) => ({ ...current, pages: toggledGroup(current.pages, group) }))}>
            {SHOW_LABELS[group]}
          </Chip>
        ))}
      </Chips>
      <Note>왔다갔다 하는 것</Note>
      <Chips label="왔다갔다 하는 것">
        {PORTION_SHOWS.map((show, index) => (
          <Chip key={show} pressed={Math.round(objects.portions) === index} onClick={() => setObjects((current) => ({ ...current, portions: index }))}>
            {SHOW_LABELS[show]}
          </Chip>
        ))}
      </Chips>
      {/* 모핑, true or false (user, 2026-10-27): on, whatever is under way morphs at both ends of its link. */}
      <Note>모핑</Note>
      <Chips label="모핑">
        <Chip pressed={objects.portionMorph < 0.5} onClick={() => setObjects((current) => ({ ...current, portionMorph: 0 }))}>
          끔
        </Chip>
        <Chip pressed={objects.portionMorph >= 0.5} onClick={() => setObjects((current) => ({ ...current, portionMorph: 1 }))}>
          켬
        </Chip>
      </Chips>
      <Note>각도</Note>
      <Chips label="각도">
        {FACINGS.map((facing, index) => (
          <Chip key={facing} pressed={Math.round(objects.facing) === index} onClick={() => setObjects((current) => ({ ...current, facing: index }))}>
            {FACING_LABELS[facing]}
          </Chip>
        ))}
      </Chips>
      {OBJECT_CONTROLS.map(slider)}
      {GROUPS.map((group) => (
        <details key={group} className={styles.set}>
          <summary>{OBJECT_GROUPS[group].label} · 세부</summary>
          <Chips label={`${OBJECT_GROUPS[group].label} 켜기`}>
            {KINDS_OF[group].map((kind) => (
              <Chip
                key={kind}
                pressed={objects[`${kind}On`] >= 0.5}
                onClick={() => setObjects((current) => ({ ...current, [`${kind}On`]: current[`${kind}On`] >= 0.5 ? 0 : 1 }))}
              >
                {OBJECT_LABELS[kind]}
              </Chip>
            ))}
          </Chips>
        </details>
      ))}
      <Reset onClick={() => setObjects(OBJECT_DEFAULTS)}>오브제 기본값으로</Reset>
    </Panel>
  );
}
