// The pieces every option panel is built from (road-signs/direction/4's control). A leaf: nothing of the experiment
// but its CSS.

import { useState, type ReactNode } from "react";
import styles from "../bubble-three.module.css";
import folds from "./folds.module.css";

export function Panel({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div id={`bubble-three-${id}`} className={`${styles.panel} ${folds.panel}`} role="group" aria-label={label}>
      <p className={styles.heading}>{label}</p>
      {children}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

/** A row of toggle buttons. */
export function Chips({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

const OFF_ON = ["끔", "켬"] as const;

/** A pair of chips, off then on (끔 · 켬 unless `labels`). A number is on from 0.5. */
export function OnOff({ label, value, labels = OFF_ON, onChange }: { label: string; value: number | boolean; labels?: readonly [ReactNode, ReactNode]; onChange: (on: boolean) => void }) {
  const off = typeof value === "boolean" ? !value : value < 0.5;
  const on = typeof value === "boolean" ? value : value >= 0.5;
  return (
    <Chips label={label}>
      <Chip pressed={off} onClick={() => onChange(false)}>
        {labels[0]}
      </Chip>
      <Chip pressed={on} onClick={() => onChange(true)}>
        {labels[1]}
      </Chip>
    </Chips>
  );
}

export function Reset({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.reset} onClick={onClick}>
      {children}
    </button>
  );
}

type SliderProps = {
  label: ReactNode;
  /** Shown after the label; omitted, the label stands alone. */
  output?: ReactNode;
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

export function Slider({ label, output, ariaLabel, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className={styles.row}>
      <span>
        {label}
        {output !== undefined && (
          <>
            {" "}
            <output>{output}</output>
          </>
        )}
      </span>
      <input
        aria-label={ariaLabel}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

/** A slider: key, label, range, step. */
export type SliderControl<Key extends string> = { key: Key; label: string; min: number; max: number; step: number };

/** How many decimals a table's values are shown with: one count for all, or by each slider's step. */
export type Digits = number | ((step: number) => number);
/** 2 decimals under a step of 1, else none (비주얼, 전파, 생애주기). */
export const DIGITS_BY_UNIT: Digits = (step) => (step < 1 ? 2 : 0);
/** 3 decimals under a step of 0.01, else 2 (액체). */
export const DIGITS_FINE: Digits = (step) => (step < 0.01 ? 3 : 2);

type ControlSlidersProps<Key extends string> = {
  controls: readonly SliderControl<Key>[];
  values: { readonly [K in Key]: number };
  /** Stands in for a value the state does not hold yet. */
  fallback?: { readonly [K in Key]: number };
  digits?: Digits;
  onChange: (key: Key, value: number) => void;
};

/** A table of controls as sliders, one each, its value shown to the table's digits. */
export function ControlSliders<Key extends string>({ controls, values, fallback, digits = 2, onChange }: ControlSlidersProps<Key>) {
  return controls.map((control) => {
    const value = fallback ? (values[control.key] ?? fallback[control.key]) : values[control.key];
    return (
      <Slider
        key={control.key}
        label={control.label}
        output={value.toFixed(typeof digits === "number" ? digits : digits(control.step))}
        ariaLabel={control.label}
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(next) => onChange(control.key, next)}
      />
    );
  });
}

// Folders (user, 2026-11-05): each panel's most-used settings stay open; the rest fold away under a rule, as
// 오브제's 세부 did first. Whether a fold is open is remembered per viewer; its content is made only while open.

const FOLD_STORE = "goldfishes.simulation-2.fold.";

function storedOpen(id: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(FOLD_STORE + id);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}

function storeOpen(id: string, open: boolean) {
  try {
    window.localStorage.setItem(FOLD_STORE + id, open ? "1" : "0");
  } catch {
    // Storage unavailable: the fold still works, it is only not remembered.
  }
}

type SectionProps = {
  /** Stable id: the remembered open/closed state's key. */
  id: string;
  title: ReactNode;
  /** The current choice, shown after the title while folded or open. */
  value?: ReactNode;
  /** Open on a first visit (most folds start closed). */
  defaultOpen?: boolean;
  children: ReactNode | (() => ReactNode);
};

/** A fold under a rule, its arrow the disclosure marker; children made only while open. */
// Open by default (user, 2026-11-05: what was open before the folds stays open); only 세부 folds start closed.
export function Section({ id, title, value, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(() => storedOpen(id, defaultOpen));
  return (
    <details
      className={folds.section}
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        if (next === open) return;
        setOpen(next);
        storeOpen(id, next);
      }}
    >
      <summary>
        {title}
        {value !== undefined && <span className={folds.value}>{value}</span>}
      </summary>
      {open && <div className={folds.body}>{typeof children === "function" ? children() : children}</div>}
    </details>
  );
}
