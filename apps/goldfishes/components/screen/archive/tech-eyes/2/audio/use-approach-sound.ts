import { useEffect, useRef, useState } from "react";
import { ApproachSound } from "./approach-sound";

export function useApproachSound() {
  const engine = useRef<ApproachSound | null>(null);
  const [enabled, setEnabled] = useState(false);
  const wanted = useRef(false);
  const [volume, setVolume] = useState(35);
  const volumeRef = useRef(35);
  const [error, setError] = useState("");
  const activate = useRef<() => void>(() => undefined);
  useEffect(() => {
    let alive = true;
    const resume = () => {
      if (!alive || !wanted.current || document.hidden) return;
      try {
        const sound = engine.current ?? (engine.current = new ApproachSound());
        sound.setVolume(volumeRef.current / 100);
        void sound.enable().catch(() => { if (alive) setError("Sound unavailable. Try sound again."); });
      } catch { if (alive) setError("Sound unavailable. Try sound again."); }
    };
    activate.current = resume;
    const visibility = () => {
      if (document.hidden) void engine.current?.pause().catch(() => undefined);
      else resume();
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    document.addEventListener("visibilitychange", visibility);
    resume();
    return () => {
      alive = false; activate.current = () => undefined;
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      document.removeEventListener("visibilitychange", visibility);
      engine.current?.dispose(); engine.current = null;
    };
  }, []);
  const toggle = () => {
    wanted.current = !wanted.current; setEnabled(wanted.current); setError("");
    if (wanted.current) activate.current();
    else void engine.current?.pause().catch(() => undefined);
  };
  const changeVolume = (value: number) => { volumeRef.current = value; setVolume(value); engine.current?.setVolume(value / 100); };
  return { engine, enabled, busy: false, volume, error, toggle, changeVolume };
}
