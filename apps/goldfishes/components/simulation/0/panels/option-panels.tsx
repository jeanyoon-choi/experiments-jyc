// The option panels at the bottom right, one open at a time (bubble/9's layout): each is drawn from its table in
// controls.ts, so a panel is data and this file does not know the model's parameters by name.

import { memo, type ReactNode } from "react";
import { digitsOf, PANELS, type Control, type PanelId } from "../controls.ts";
import type { Parameters } from "../model.ts";
import { Note, Pair, Panel, Reset, Section, Slider } from "../ui/controls";
import styles from "../ui/controls.module.css";

type Change = (key: keyof Parameters, value: number) => void;

function Controls({ controls, parameters, onChange }: { controls: readonly Control[]; parameters: Parameters; onChange: Change }) {
  return controls.map((control) => {
    const value = parameters[control.key];
    if ("choices" in control) return <Pair key={control.key} label={control.label} on={value >= 0.5} choices={control.choices} onChange={(on) => onChange(control.key, on ? 1 : 0)} />;
    return <Slider key={control.key} label={control.label} output={value.toFixed(digitsOf(control.step))} min={control.min} max={control.max} step={control.step} value={value} onChange={(next) => onChange(control.key, next)} />;
  });
}

type Props = {
  panel: PanelId | null;
  onToggle: (panel: PanelId) => void;
  parameters: Parameters;
  onChange: Change;
  /** The same values on a new screen, and M9's values. */
  onRestart: () => void;
  onDefaults: () => void;
};

const ICONS: Record<PanelId, ReactNode> = {
  fish: (
    <>
      <path d="M13.5 10c0 2-2.6 3.6-5.6 3.6S3 12 3 10s1.9-3.6 4.9-3.6 5.6 1.6 5.6 3.6z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13.5 10l3.5-3v6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="6" cy="9.4" r="0.9" fill="currentColor" />
    </>
  ),
  bubble: (
    <>
      <circle cx="8" cy="11.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14.5" cy="5.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  audience: <path d="M3.5 14.5c2.5-7 4.5-7 6.5-3s4 3 6.5-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
};

export const OptionPanels = memo(function OptionPanels({ panel, onToggle, parameters, onChange, onRestart, onDefaults }: Props) {
  const open = PANELS.find((entry) => entry.id === panel);
  return (
    <div className={styles.control}>
      {open && (
        <Panel id={open.id} label={open.label}>
          <Note>{open.note}</Note>
          {open.groups.map((group) =>
            group.title ? (
              <Section key={group.title} id={`${open.id}/${group.title}`} title={group.title}>
                <Controls controls={group.controls} parameters={parameters} onChange={onChange} />
              </Section>
            ) : (
              <Controls key="open" controls={group.controls} parameters={parameters} onChange={onChange} />
            ),
          )}
          {open.id === "audience" && (
            <>
              <Reset onClick={onRestart}>다시 시작</Reset>
              <Reset onClick={onDefaults}>M9 값으로</Reset>
            </>
          )}
        </Panel>
      )}
      <div className={styles.triggers}>
        {PANELS.map((entry) => (
          <button key={entry.id} type="button" className={styles.trigger} aria-label={`${entry.label} 옵션`} aria-expanded={panel === entry.id} aria-controls={`simulation-${entry.id}`} onClick={() => onToggle(entry.id)}>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              {ICONS[entry.id]}
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
});
