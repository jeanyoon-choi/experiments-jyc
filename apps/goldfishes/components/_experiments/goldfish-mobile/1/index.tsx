"use client";

// goldfish-mobile/1 (user, 2026-11-13; a light trial under components/_experiments): the work's goldfish holding a
// mobile by its edges and looking into it, the screen a feed of short clips that keeps being swiped on. One fish, or
// a wall of mobiles with a fish at each. Options are bubble/9's control: a round trigger at the bottom right opening
// a panel of chips and sliders; X hides every control.
// Folders: fish/ (the goldfish, instanced), mobile/ (the slabs and their feeds), panels/ (the control); scene.ts
// puts them in a white studio. Drag to look round.

import { useEffect, useRef, useState } from "react";
import styles from "./goldfish-mobile.module.css";
import controls from "./panels/panels.module.css";
import { useHiddenUi } from "./panels/hidden-ui";
import { OptionsPanel } from "./panels/options-panel";
import { startScene } from "./scene";
import { DEFAULTS, type Settings } from "./settings";

export default function GoldfishMobile() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof startScene> | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [open, setOpen] = useState(false);
  const uiHidden = useHiddenUi();
  const latest = useRef(settings);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = startScene(canvas, latest.current);
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
  }, []);
  useEffect(() => {
    latest.current = settings;
    sceneRef.current?.apply(settings);
  }, [settings]);
  return (
    <main className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Goldfish holding mobiles and watching their feeds" />
      <div hidden={uiHidden}>
        <div className={controls.control}>
          {open && <OptionsPanel settings={settings} setSettings={setSettings} />}
          <div className={controls.triggers}>
            <button type="button" className={controls.trigger} aria-label="금붕어와 모바일 옵션" aria-expanded={open} aria-controls="goldfish-mobile-options" onClick={() => setOpen((current) => !current)}>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <path d="M13.5 10c0 2-2.6 3.6-5.6 3.6S3 12 3 10s1.9-3.6 4.9-3.6 5.6 1.6 5.6 3.6z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M13.5 10l3.5-3v6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <circle cx="6" cy="9.4" r="0.9" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
