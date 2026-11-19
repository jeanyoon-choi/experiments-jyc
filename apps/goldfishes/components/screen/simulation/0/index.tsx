"use client";

// simulation/0 (2026-11-18): the weekend's model M9 moved into the archive, rules apart from drawing. Two myopic
// agents — goldfish after something less boring, bubbles after their own audience — each seeing only what touches
// it; nothing new appears unless a finger is drawn across the field. model.ts is the rules, packing.ts where
// bubbles sit, measure.ts and scenes.ts read the screen's state without a screen, view.ts draws it as the gallery did.
// Over the canvas, laid out as bubble/9's: the versions at the bottom left (panels/version-switch.tsx), the option
// panels at the bottom right (panels/option-panels.tsx), both drawn from controls.ts. X hides them.

import { useCallback, useEffect, useRef, useState } from "react";
import { AT_START, versionOf, type PanelId, type VersionId } from "./controls.ts";
import { M9, PRESETS, type Parameters } from "./model.ts";
import { OptionPanels } from "./panels/option-panels";
import { VersionSwitch } from "./panels/version-switch";
import { startView, type View } from "./view.ts";

export default function Simulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View | null>(null);
  const [parameters, setParameters] = useState<Parameters>(M9);
  // The values as the handlers and a remounted view read them.
  const parametersRef = useRef(parameters);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const view = startView(canvas, parametersRef.current);
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view?.dispose();
    };
  }, []);

  // X hides the controls and brings them back (by the key's position, so under a Korean layout too).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyX" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      setHidden((current) => !current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const apply = useCallback((next: Parameters, restart: boolean) => {
    parametersRef.current = next;
    setParameters(next);
    if (restart) viewRef.current?.restart(next);
    else viewRef.current?.set(next);
  }, []);
  const change = useCallback((key: keyof Parameters, value: number) => apply({ ...parametersRef.current, [key]: value }, AT_START.has(key)), [apply]);
  // A version is a screen of its own: it starts again.
  const version = useCallback((id: VersionId) => apply(PRESETS[id], true), [apply]);
  const restart = useCallback(() => apply(parametersRef.current, true), [apply]);
  const defaults = useCallback(() => apply(M9, true), [apply]);
  const toggle = useCallback((id: PanelId) => setPanel((current) => (current === id ? null : id)), []);

  return (
    <main style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#fff" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none" }} />
      <div hidden={hidden}>
        <VersionSwitch version={versionOf(parameters)} onVersion={version} />
        <OptionPanels panel={panel} onToggle={toggle} parameters={parameters} onChange={change} onRestart={restart} onDefaults={defaults} />
      </div>
    </main>
  );
}
