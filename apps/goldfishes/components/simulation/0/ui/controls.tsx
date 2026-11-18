// The pieces the option panels are built from (bubble/9's ui/controls.tsx, copied: experiments stand alone). A leaf:
// nothing of the experiment but its CSS.

import { useState, type ReactNode } from "react";
import styles from "./controls.module.css";

export function Panel({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div id={`simulation-${id}`} className={styles.panel} role="group" aria-label={label}>
      <p className={styles.heading}>{label}</p>
      {children}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

/** A pair of chips for a condition that is off or on. */
export function Pair({ label, on, choices, onChange }: { label: string; on: boolean; choices: readonly [string, string]; onChange: (on: boolean) => void }) {
  return (
    <>
      <Note>{label}</Note>
      <div className={styles.chips} role="group" aria-label={label}>
        <button type="button" aria-pressed={!on} onClick={() => onChange(false)}>
          {choices[0]}
        </button>
        <button type="button" aria-pressed={on} onClick={() => onChange(true)}>
          {choices[1]}
        </button>
      </div>
    </>
  );
}

export function Reset({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.reset} onClick={onClick}>
      {children}
    </button>
  );
}

type SliderProps = { label: string; output: ReactNode; min: number; max: number; step: number; value: number; onChange: (value: number) => void };

export function Slider({ label, output, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className={styles.row}>
      <span>
        {label} <output>{output}</output>
      </span>
      <input aria-label={label} max={max} min={min} step={step} type="range" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

const FOLD_STORE = "goldfishes.simulation-0.fold.";

function storedOpen(id: string) {
  try {
    return window.localStorage.getItem(FOLD_STORE + id) !== "0";
  } catch {
    return true;
  }
}

function storeOpen(id: string, open: boolean) {
  try {
    window.localStorage.setItem(FOLD_STORE + id, open ? "1" : "0");
  } catch {
    // Storage unavailable: the fold still works, it is only not remembered.
  }
}

/** A fold under a rule; whether it is open is remembered per viewer, and its content is made only while open. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(() => storedOpen(id));
  return (
    <details
      className={styles.section}
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        if (next === open) return;
        setOpen(next);
        storeOpen(id, next);
      }}
    >
      <summary>{title}</summary>
      {open && <div className={styles.body}>{children}</div>}
    </details>
  );
}
