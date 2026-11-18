// bubble/7's modes, at the bottom left (user, 2026-10-27): 군집 (the raft, as
// bubble/6), 전파 (the raft, strains of colour and object spreading through it)
// and 랩 (one object at a time, to tune the liquid morph and the material).
// Each mode's own settings fold out above the switch (mode-panels.tsx), the less used folded again (2026-11-05);
// between them and the switch, the presets (preset-switch.tsx).

import { memo, useState, type Dispatch, type SetStateAction } from "react";
import type { LabSettings } from "../objects/morph/lab";
import type { ObjectParameters } from "../objects/kinds/parameters";
import { PRESET_FAMILIES, type Preset } from "../presets";
import type { SpreadParameters } from "../spread/contagion";
import type { Mode } from "../state/schema";
import styles from "./mode-control.module.css";
import { LabPanel, SpreadPanel } from "./mode-panels";
import { PresetSwitch } from "./preset-switch";

const MODES: readonly { id: Mode; label: string }[] = [
  { id: "raft", label: "군집" },
  { id: "spread", label: "전파" },
  { id: "lab", label: "랩" },
];

type Props = {
  mode: Mode;
  onMode: (mode: Mode) => void;
  objects: ObjectParameters;
  setObjects: Dispatch<SetStateAction<ObjectParameters>>;
  lab: LabSettings;
  setLab: Dispatch<SetStateAction<LabSettings>>;
  /** The 랩's morph under way (field kinds). */
  labMorph: { from: string; to: string };
  spread: SpreadParameters;
  setSpread: Dispatch<SetStateAction<SpreadParameters>>;
  /** Which preset the values now are (null: none), and choosing one. */
  preset: Preset | null;
  onPreset: (preset: Preset) => void;
};

export const ModeControl = memo(function ModeControl({ mode, onMode, objects, setObjects, lab, setLab, labMorph, spread, setSpread, preset, onPreset }: Props) {
  const [open, setOpen] = useState(true);
  const hasPanel = mode !== "raft";
  return (
    <div className={styles.modes}>
      {hasPanel && open && mode === "lab" && <LabPanel objects={objects} setObjects={setObjects} lab={lab} setLab={setLab} labMorph={labMorph} />}
      {hasPanel && open && mode === "spread" && <SpreadPanel spread={spread} setSpread={setSpread} />}
      <PresetSwitch families={PRESET_FAMILIES} preset={preset} onPreset={onPreset} />
      <div className={styles.switch} role="group" aria-label="모드">
        {MODES.map((option) => (
          <button key={option.id} type="button" aria-pressed={mode === option.id} onClick={() => onMode(option.id)}>
            {option.label}
          </button>
        ))}
        {hasPanel && (
          <button type="button" className={styles.fold} aria-expanded={open} aria-controls="bubble-seven-mode" aria-label={open ? "설정 접기" : "설정 펼치기"} onClick={() => setOpen((current) => !current)}>
            {open ? "−" : "+"}
          </button>
        )}
      </div>
    </div>
  );
});
