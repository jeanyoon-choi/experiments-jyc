import type { Dispatch, SetStateAction } from "react";
import { Chip, Chips, Note, Panel, Reset, Slider } from "../panels/controls";
import {
  OBJECT_CONTROLS,
  OBJECT_DEFAULTS,
  OBJECT_LABELS,
  OBJECT_SETS,
  FACING_LABELS,
  FACINGS,
  PAGE_SHOWS,
  PORTION_SHOWS,
  SHOW_LABELS,
  type ObjectControl,
  type ObjectParameters,
  type ObjectSet,
} from "./objects";
import styles from "./objects.module.css";

type Props = {
  objects: ObjectParameters;
  setObjects: Dispatch<SetStateAction<ObjectParameters>>;
};

/**
 * 오브제's panel: what the pages and the portions under way are shown as,
 * size and puff; each set's kinds folded away, one chip each (pressed: on).
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
  const choice = (label: string, key: "pages" | "portions", shows: readonly (keyof typeof SHOW_LABELS)[]) => (
    <>
      <Note>{label}</Note>
      <Chips label={label}>
        {shows.map((show, index) => (
          <Chip key={show} pressed={Math.round(objects[key]) === index} onClick={() => setObjects((current) => ({ ...current, [key]: index }))}>
            {SHOW_LABELS[show]}
          </Chip>
        ))}
      </Chips>
    </>
  );
  return (
    <Panel id="objects" label="오브제">
      {choice("페이지", "pages", PAGE_SHOWS)}
      {choice("왔다갔다 하는 것", "portions", PORTION_SHOWS)}
      <Note>각도</Note>
      <Chips label="각도">
        {FACINGS.map((facing, index) => (
          <Chip key={facing} pressed={Math.round(objects.facing) === index} onClick={() => setObjects((current) => ({ ...current, facing: index }))}>
            {FACING_LABELS[facing]}
          </Chip>
        ))}
      </Chips>
      {OBJECT_CONTROLS.map(slider)}
      {(Object.keys(OBJECT_SETS) as ObjectSet[]).map((set) => (
        <details key={set} className={styles.set}>
          <summary>{OBJECT_SETS[set].label} · 세부</summary>
          <Chips label={`${OBJECT_SETS[set].label} 켜기`}>
            {OBJECT_SETS[set].kinds.map((kind) => (
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
