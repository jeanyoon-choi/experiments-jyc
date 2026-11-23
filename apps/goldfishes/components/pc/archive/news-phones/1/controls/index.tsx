import type { FieldSettings } from "../model/config";
import styles from "../phone-field.module.css";

const controls: { key: keyof FieldSettings; label: string; min: number; max: number; step: number; factor: number; unit: string }[] = [
  { key: "phoneCount", label: "phones", min: 1, max: 192, step: 1, factor: 1, unit: "" },
  { key: "minimumRows", label: "min rows", min: 1, max: 12, step: 1, factor: 1, unit: "" },
  { key: "phoneScale", label: "size", min: 50, max: 100, step: 1, factor: 100, unit: "%" },
  { key: "gapRatio", label: "margin", min: 0, max: 25, step: 0.5, factor: 100, unit: "%" },
  { key: "keywordPresenceProbability", label: "presence", min: 0, max: 100, step: 1, factor: 100, unit: "%" },
  { key: "speed", label: "speed", min: 0.25, max: 10, step: 0.25, factor: 1, unit: "×" },
];

export default function FieldControls({ settings, columns, rows, onChange }: {
  settings: FieldSettings;
  columns: number;
  rows: number;
  onChange: (key: keyof FieldSettings, value: number) => void;
}) {
  return (
    <section className={styles.controls} aria-label="Phone field test">
      {controls.map(({ key, label, min, max, step, factor, unit }) => (
        <label className={styles.sizeControl} key={key}>
          <span>{label}</span>
          <input type="range" min={min} max={max} step={step} value={settings[key] * factor}
            onChange={(event) => onChange(key, Number(event.currentTarget.value) / factor)} />
          <output>{Number((settings[key] * factor).toFixed(2))}{unit}</output>
        </label>
      ))}
      <output className={styles.gridReadout} aria-label="Actual grid columns and rows">{columns} × {rows}</output>
    </section>
  );
}
