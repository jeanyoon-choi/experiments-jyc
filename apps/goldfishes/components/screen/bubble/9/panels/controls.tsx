// The pieces every option panel is built from (road-signs/direction/4's control).

import { useState, type ReactNode } from "react";
import styles from "../bubble-three.module.css";
import type { PanelId } from "../settings";
import folds from "./panels.module.css";

export function Panel({ id, label, children }: { id: PanelId; label: string; children: ReactNode }) {
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

// Folders (user, 2026-11-05): each panel's most-used settings stay open; the rest fold away under a rule, as
// 오브제's 세부 did first. Whether a fold is open is remembered per viewer; its content is made only while open.

const FOLD_STORE = "goldfishes.bubble-9.fold.";

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
