// Choosing among hundreds of kinds (bubble/9's catalogue): each catalogue group folded away, and in it each subgroup
// folded away, so a panel is never a wall of chips. A fold's chips are only made while it is open (the panels
// re-render as the 랩's morph moves on). bubble/5–8's kinds stay as they were, one row of chips.

import type { ReactNode } from "react";
import { Chip, Chips, Section } from "../ui/controls";
import { CATALOGUE_GROUP_IDS, GROUP_LABEL, GROUPS, KINDS_OF, SUBGROUPS_OF, type ObjectGroup, type ObjectKind } from "../objects/kinds/parameters";

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

type Subgroup = (typeof SUBGROUPS_OF)[ObjectGroup][number];

type CatalogueFoldsProps = {
  /** The folds' ids start with it (their open or closed state's key). */
  id: string;
  /** What follows a group's name in its summary, and a subgroup's in its own. */
  groupNote: (group: ObjectGroup) => string | number;
  subNote: (sub: Subgroup) => string | number;
  /** A subgroup's row of chips: its label, and the chips before its kinds'. */
  chipsLabel: (group: ObjectGroup, sub: Subgroup) => string;
  before?: (sub: Subgroup) => ReactNode;
  chip: (kind: ObjectKind) => ReactNode;
};

/** Each catalogue group folded, each of its subgroups folded in it, one chip per kind (오브제's 세부, and the kinds to pick from). */
export function CatalogueFolds({ id, groupNote, subNote, chipsLabel, before, chip }: CatalogueFoldsProps) {
  return CATALOGUE_PANEL_GROUPS.map((group) => (
    <Fold key={group} id={`${id}/${group}`} summary={`${GROUP_LABEL[group]} · ${groupNote(group)}`}>
      {() =>
        SUBGROUPS_OF[group].map((sub) => (
          <Fold key={sub.label} id={`${id}/${group}/${sub.label}`} summary={`${sub.label || GROUP_LABEL[group]} · ${subNote(sub)}`}>
            {() => (
              <Chips label={chipsLabel(group, sub)}>
                {before?.(sub)}
                {sub.kinds.map(chip)}
              </Chips>
            )}
          </Fold>
        ))
      }
    </Fold>
  ));
}

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
      <CatalogueFolds id={label} groupNote={(group) => KINDS_OF[group].length} subNote={(sub) => sub.kinds.length} chipsLabel={(_, sub) => `${label} · ${sub.label}`} chip={chip} />
    </>
  );
}
