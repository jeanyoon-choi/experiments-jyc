import type { ReactNode } from "react";
import styles from "../bubble-three.module.css";
import type { PanelId } from "../settings";

const TRIGGERS: readonly { id: PanelId; label: string; icon: (soundOn: boolean) => ReactNode }[] = [
  {
    id: "network",
    label: "네트워크 옵션",
    icon: () => (
      <>
        <path d="M5 6l10 3M5 6l3 9M15 9l-7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="5" cy="6" r="2" fill="#171717" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="15" cy="9" r="2" fill="#171717" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="15" r="2" fill="#171717" stroke="currentColor" strokeWidth="1.4" />
      </>
    ),
  },
  {
    id: "visual",
    label: "비주얼 옵션",
    icon: () => (
      <>
        <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7" cy="6" r="2.2" fill="#171717" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="13" cy="14" r="2.2" fill="#171717" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
  },
  {
    id: "fish",
    label: "금붕어 옵션",
    icon: () => (
      <>
        <path d="M13.5 10c0 2-2.6 3.6-5.6 3.6S3 12 3 10s1.9-3.6 4.9-3.6 5.6 1.6 5.6 3.6z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M13.5 10l3.5-3v6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="6" cy="9.4" r="0.9" fill="currentColor" />
      </>
    ),
  },
  {
    id: "media",
    label: "미디어 옵션",
    icon: () => (
      <>
        <rect x="3" y="4" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.5 14l4-4.5 3 3 2-2 4 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="13" cy="7.5" r="1.2" fill="currentColor" />
      </>
    ),
  },
  {
    id: "sound",
    label: "소리 옵션",
    icon: (soundOn) => (
      <>
        <path d="M3.5 8h3l4-3.5v11l-4-3.5h-3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        {soundOn && <path d="M13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.3 6.3 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
      </>
    ),
  },
];

/** The round buttons that open one panel at a time. */
export function PanelTriggers({ panel, onToggle, soundOn }: { panel: PanelId | null; onToggle: (panel: PanelId) => void; soundOn: boolean }) {
  return (
    <div className={styles.triggers}>
      {TRIGGERS.map((trigger) => (
        <button
          key={trigger.id}
          type="button"
          className={styles.trigger}
          aria-label={trigger.label}
          aria-expanded={panel === trigger.id}
          aria-controls={`bubble-three-${trigger.id}`}
          onClick={() => onToggle(trigger.id)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            {trigger.icon(soundOn)}
          </svg>
        </button>
      ))}
    </div>
  );
}
