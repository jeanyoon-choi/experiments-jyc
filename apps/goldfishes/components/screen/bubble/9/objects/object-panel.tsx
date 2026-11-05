import type { Dispatch, SetStateAction } from "react";
import { Chip, Chips, Note, Panel, Reset, Section, Slider } from "../panels/controls";
import { BASE_PANEL_GROUPS, CATALOGUE_PANEL_GROUPS, Fold } from "./kind-chips";
import {
  OBJECT_CONTROLS,
  OBJECT_DEFAULTS,
  OBJECT_LABELS,
  GROUP_LABEL,
  KINDS_OF,
  GROUPS,
  groupBit,
  onCount,
  SUBGROUPS_OF,
  withKinds,
  FACING_LABELS,
  FACINGS,
  hasGroup,
  PORTION_SHOWS,
  SHOW_LABELS,
  toggledGroup,
  type ObjectControl,
  type ObjectParameters,
} from "./objects";

type Props = {
  objects: ObjectParameters;
  setObjects: Dispatch<SetStateAction<ObjectParameters>>;
};

/** Every group at once in a pages mask (모두 선택; 버블 is no group). */
const ALL_GROUPS = () => GROUPS.reduce((mask, group) => mask | groupBit(group), 0);

/**
 * 오브제's panel (folders, user 2026-11-05): what the pages are shown as, open; what goes back and forth, the
 * form's settings, and each group's kinds folded away, one chip each (pressed: on).
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
  const kindChip = (kind: string) => (
    <Chip key={kind} pressed={objects[`${kind}On`] >= 0.5} onClick={() => setObjects((current) => ({ ...current, [`${kind}On`]: current[`${kind}On`] >= 0.5 ? 0 : 1 }))}>
      {OBJECT_LABELS[kind]}
    </Chip>
  );
  const pageGroups = GROUPS.filter((group) => hasGroup(objects.pages, group)).length;
  const portionShow = PORTION_SHOWS[Math.round(objects.portions)];
  return (
    <Panel id="objects" label="오브제">
      {/* 페이지, AND not OR (user, 2026-11-03): any combination of the groups, mixed; 버블 clears them, 모두 선택 takes every group. */}
      <Section id="objects/pages" title="페이지" value={pageGroups === 0 ? SHOW_LABELS.bubble : `${pageGroups}/${GROUPS.length}`} defaultOpen>
        <Chips label="페이지">
          <Chip pressed={Math.round(objects.pages) === 0} onClick={() => setObjects((current) => ({ ...current, pages: 0 }))}>
            {SHOW_LABELS.bubble}
          </Chip>
          <Chip pressed={pageGroups === GROUPS.length} onClick={() => setObjects((current) => ({ ...current, pages: ALL_GROUPS() }))}>
            모두 선택
          </Chip>
          {GROUPS.map((group) => (
            <Chip key={group} pressed={hasGroup(objects.pages, group)} onClick={() => setObjects((current) => ({ ...current, pages: toggledGroup(current.pages, group) }))}>
              {SHOW_LABELS[group]}
            </Chip>
          ))}
        </Chips>
      </Section>
      <Section id="objects/portions" title="왔다갔다 하는 것" value={portionShow === undefined ? undefined : SHOW_LABELS[portionShow]}>
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
      </Section>
      <Section id="objects/form" title="모양">
        <Note>각도</Note>
        <Chips label="각도">
          {FACINGS.map((facing, index) => (
            <Chip key={facing} pressed={Math.round(objects.facing) === index} onClick={() => setObjects((current) => ({ ...current, facing: index }))}>
              {FACING_LABELS[facing]}
            </Chip>
          ))}
        </Chips>
        {OBJECT_CONTROLS.map(slider)}
      </Section>
      {BASE_PANEL_GROUPS.map((group) => (
        <Fold key={group} id={`objects/kinds/${group}`} summary={`${GROUP_LABEL[group]} · 세부`}>
          {() => <Chips label={`${GROUP_LABEL[group]} 켜기`}>{KINDS_OF[group].map(kindChip)}</Chips>}
        </Fold>
      ))}
      {/* 기호의 파티 (bubble/9): a catalogue group's hundred kinds folded by subgroup, each with 모두 켬 / 모두 끔. */}
      {CATALOGUE_PANEL_GROUPS.map((group) => (
        <Fold key={group} id={`objects/kinds/${group}`} summary={`${GROUP_LABEL[group]} · 세부`}>
          {() =>
            SUBGROUPS_OF[group].map((sub) => (
              <Fold key={sub.label} id={`objects/kinds/${group}/${sub.label}`} summary={`${sub.label || GROUP_LABEL[group]} · ${onCount(objects, sub.kinds)}/${sub.kinds.length}`}>
                {() => (
                  <Chips label={`${GROUP_LABEL[group]} · ${sub.label} 켜기`}>
                    <Chip pressed={onCount(objects, sub.kinds) === sub.kinds.length} onClick={() => setObjects((current) => withKinds(current, sub.kinds, true))}>
                      모두 켬
                    </Chip>
                    <Chip pressed={onCount(objects, sub.kinds) === 0} onClick={() => setObjects((current) => withKinds(current, sub.kinds, false))}>
                      모두 끔
                    </Chip>
                    {sub.kinds.map(kindChip)}
                  </Chips>
                )}
              </Fold>
            ))
          }
        </Fold>
      ))}
      <Reset onClick={() => setObjects(OBJECT_DEFAULTS)}>오브제 기본값으로</Reset>
    </Panel>
  );
}
