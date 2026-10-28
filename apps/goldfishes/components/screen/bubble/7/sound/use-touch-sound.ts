"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TouchSound, type SoundParameters } from "./sound";

/**
 * 소리: on from the start (user, 2026-10-28: "auto sound on"). A browser lets audio start only
 * after a gesture on the page, so the engine is made at once and resumed both straight away
 * (which a kiosk with `--autoplay-policy=no-user-gesture-required` allows) and on the first
 * tap, click or key anywhere. Until then it stays silent. `playing()` is the engine while it
 * is on, for the frame loop.
 */
export function useTouchSound(parameters: SoundParameters) {
  const [on, setOn] = useState(true);
  const onRef = useRef(true);
  const engineRef = useRef<TouchSound | null>(null);
  const parametersRef = useRef(parameters);
  useEffect(() => {
    parametersRef.current = parameters;
    engineRef.current?.setParameters(parameters);
  }, [parameters]);
  useEffect(() => {
    // On at mount, and after a remount while 켬 (a hot reload) the closed engine is rebuilt.
    if (onRef.current && !engineRef.current) {
      engineRef.current = new TouchSound();
      engineRef.current.setParameters(parametersRef.current);
      void engineRef.current.resume();
    }
    const unlock = () => {
      if (onRef.current) void engineRef.current?.resume();
    };
    const events = ["pointerdown", "keydown", "touchend"] as const;
    for (const event of events) window.addEventListener(event, unlock, { capture: true });
    return () => {
      for (const event of events) window.removeEventListener(event, unlock, { capture: true });
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);
  const toggle = useCallback((next: boolean) => {
    setOn(next);
    onRef.current = next;
    if (next) {
      engineRef.current ??= new TouchSound();
      engineRef.current.setParameters(parametersRef.current);
      void engineRef.current.resume();
    } else {
      void engineRef.current?.suspend();
    }
  }, []);
  const playing = useCallback(() => (onRef.current ? engineRef.current : null), []);
  return { on, toggle, playing };
}
