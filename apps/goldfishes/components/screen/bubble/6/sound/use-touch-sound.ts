"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TouchSound, type SoundParameters } from "./sound";

/**
 * 소리: off until the panel's button starts it (the browser needs a gesture).
 * `playing()` is the engine while it is on, for the frame loop.
 */
export function useTouchSound(parameters: SoundParameters) {
  const [on, setOn] = useState(false);
  const onRef = useRef(false);
  const engineRef = useRef<TouchSound | null>(null);
  const parametersRef = useRef(parameters);
  useEffect(() => {
    parametersRef.current = parameters;
    engineRef.current?.setParameters(parameters);
  }, [parameters]);
  useEffect(() => {
    // A remount while 켬 (a hot reload) rebuilds the closed engine.
    if (onRef.current && !engineRef.current) {
      engineRef.current = new TouchSound();
      engineRef.current.setParameters(parametersRef.current);
      void engineRef.current.resume();
    }
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);
  const toggle = useCallback((next: boolean) => {
    setOn(next);
    onRef.current = next;
    if (next) {
      engineRef.current ??= new TouchSound();
      engineRef.current.setParameters(parameters);
      void engineRef.current.resume();
    } else {
      void engineRef.current?.suspend();
    }
  }, [parameters]);
  const playing = useCallback(() => (onRef.current ? engineRef.current : null), []);
  return { on, toggle, playing };
}
