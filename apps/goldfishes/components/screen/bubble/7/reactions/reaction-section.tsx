import { useState, type Dispatch, type SetStateAction } from "react";
import { Chip, Chips, Reset, Slider } from "../panels/controls";
import { reactionMarkup } from "./glyphs";
import {
  KIND_CONTROLS,
  REACTION_CONTROLS,
  REACTION_DEFAULTS,
  REACTION_KINDS,
  type ReactionControl,
  type ReactionKind,
  type ReactionParameters,
} from "./reactions";
import styles from "./reactions.module.css";

type Props = {
  reactions: ReactionParameters;
  setReactions: Dispatch<SetStateAction<ReactionParameters>>;
};

/**
 * 반응's controls, set apart at the end of the fish panel: those for all three, then one group per kind, each with its own 끔/켬.
 * Folded under its heading until opened (user, 2026-10-27).
 */
export function ReactionSection({ reactions, setReactions }: Props) {
  const slider = (control: ReactionControl) => (
    <Slider
      key={control.key}
      label={control.label}
      output={reactions[control.key].toFixed(control.step < 1 ? 2 : 0)}
      ariaLabel={control.label}
      min={control.min}
      max={control.max}
      step={control.step}
      value={reactions[control.key]}
      onChange={(value) =>
        setReactions((current) => ({ ...current, [control.key]: value }))
      }
    />
  );
  const on = (kind: ReactionKind) => reactions[`${kind}On`] >= 0.5;
  const turn = (kinds: readonly ReactionKind[], value: number) =>
    setReactions((current) => ({
      ...current,
      ...Object.fromEntries(kinds.map((kind) => [`${kind}On`, value])),
    }));
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.section} role="group" aria-label="반응">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="bubble-three-reactions"
        onClick={() => setOpen((current) => !current)}
      >
        <span>반응</span>
        <span className={styles.toggleNote}>
          버블에 닿을 때 하트 · 좋아요 · 댓글
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div id="bubble-three-reactions" className={styles.body}>
          <Chips label="반응 모두 켜기">
            <Chip
              pressed={!REACTION_KINDS.some(on)}
              onClick={() => turn(REACTION_KINDS, 0)}
            >
              모두 끔
            </Chip>
            <Chip
              pressed={REACTION_KINDS.every(on)}
              onClick={() => turn(REACTION_KINDS, 1)}
            >
              모두 켬
            </Chip>
          </Chips>
          {REACTION_CONTROLS.map(slider)}
          {KIND_CONTROLS.map((group) => (
            <div
              key={group.kind}
              className={styles.kind}
              role="group"
              aria-label={group.label}
            >
              <p className={styles.kindHeading}>
                <span
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{
                    __html: reactionMarkup(group.kind),
                  }}
                />
                {group.label}
              </p>
              <Chips label={`${group.label} 켜기`}>
                <Chip
                  pressed={!on(group.kind)}
                  onClick={() => turn([group.kind], 0)}
                >
                  끔
                </Chip>
                <Chip
                  pressed={on(group.kind)}
                  onClick={() => turn([group.kind], 1)}
                >
                  켬
                </Chip>
              </Chips>
              {group.controls.map(slider)}
            </div>
          ))}
          <Reset onClick={() => setReactions(REACTION_DEFAULTS)}>
            반응 기본값으로
          </Reset>
        </div>
      )}
    </div>
  );
}
