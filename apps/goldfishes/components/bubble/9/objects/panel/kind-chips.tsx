// Choosing among hundreds of kinds (bubble/9's catalogue): each catalogue group folded away, and in it each subgroup
// folded away, so a panel is never a wall of chips. A fold's chips are only made while it is open (the panels
// re-render as the 랩's morph moves on). bubble/5–8's kinds stay as they were, one row of chips.

import type { ReactNode } from "react";
import { Chip, Chips, Section } from "../../panels/controls";
import { CATALOGUE_GROUP_IDS, GROUP_LABEL, GROUPS, KINDS_OF, SUBGROUPS_OF, type ObjectGroup, type ObjectKind } from "../kinds/parameters";

/** A fold under a rule (오브제's 세부), its content made only while open; `id` keeps it open or closed per viewer. */
export function Fold({ id, summary, children }: { id: string; summary: ReactNode; children: () => ReactNode }) {
  return (
    <Section id={id} title={summary} defaultOpen={false}>
      {children}
    </Section>
  );
}

/** bubble/5–8's groups, whose kinds the panels show as one row as before. */
export const BASE_PANEL_GROUPS: readonly ObjectGroup[] = GROUPS.filter((group) => !CATALOGUE_GROUP_IDS.has(group));
/** The catalogue's groups, each folded. */
export const CATALOGUE_PANEL_GROUPS: readonly ObjectGroup[] = GROUPS.filter((group) => CATALOGUE_GROUP_IDS.has(group));

type Props = {
  /** The row's label (its chips' group). */
  label: string;
  /** The first chips: the bubble and bubble/5–8's kinds, as before. */
  first: readonly string[];
  labelOf: (kind: string) => string;
  pressed: (kind: string) => boolean;
  onPick: (kind: ObjectKind) => void;
};

/** One chip per kind: the first row as before, then each catalogue group folded, each subgroup folded in it. */
export function KindChips({ label, first, labelOf, pressed, onPick }: Props) {
  const chip = (kind: string) => (
    <Chip key={kind} pressed={pressed(kind)} onClick={() => onPick(kind)}>
      {labelOf(kind)}
    </Chip>
  );
  return (
    <>
      <Chips label={label}>{first.map(chip)}</Chips>
      {CATALOGUE_PANEL_GROUPS.map((group) => (
        <Fold key={group} id={`${label}/${group}`} summary={`${GROUP_LABEL[group]} · ${KINDS_OF[group].length}`}>
          {() =>
            SUBGROUPS_OF[group].map((sub) => (
              <Fold key={sub.label} id={`${label}/${group}/${sub.label}`} summary={`${sub.label || GROUP_LABEL[group]} · ${sub.kinds.length}`}>
                {() => <Chips label={`${label} · ${sub.label}`}>{sub.kinds.map(chip)}</Chips>}
              </Fold>
            ))
          }
        </Fold>
      ))}
    </>
  );
}
