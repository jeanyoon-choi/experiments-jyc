import { useEffect, useRef } from "react";
import { sampleEyeBlinkPlan, sampleFirstBlinkDelay } from "../model/eye-blink-timing";
import { techPowerFaces } from "../model/tech-power-faces.generated";
import type { EyeBlinkController, EyeBlinkRequest } from "../model/eye-blink-controller";

const positions = ["0% 0%", "50% 0%", "100% 0%", "0% 100%", "50% 100%"];

export function TechEyeBlink({ index, gradient, active, paused = false, controller }: {
  index: number;
  gradient?: string;
  active: boolean;
  paused?: boolean;
  controller: EyeBlinkController;
}) {
  const surface = useRef<HTMLSpanElement>(null);
  const eyelid = useRef<HTMLSpanElement>(null);
  const person = techPowerFaces[index % techPowerFaces.length]!;
  const source = `/images/0922/tech-eye-blink/${person.id}.webp`;

  useEffect(() => {
    const element = surface.current;
    const lid = eyelid.current;
    if (!element || !lid) return;
    // Bubble activity controls the clock, never the photograph/crop. Keep the
    // decoded open frame through leaving, empty, entering, and pause changes.
    let loaded = element.dataset.loadedSource === source;
    element.style.visibility = loaded ? "visible" : "hidden";
    let disposed = false;
    let timer: number | undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canBlink = (manual = false) => active && loaded && !disposed && !document.hidden
      && (manual || (!paused && !motion.matches));
    const showFrame = (frame: number) => {
      lid.style.backgroundPosition = `center, ${positions[frame]}`;
      element.dataset.blinkFrame = String(frame);
    };
    const stop = () => {
      window.clearTimeout(timer);
      showFrame(0);
    };
    const blink = (manual = false, secondOfPair = false, request?: EyeBlinkRequest) => {
      if (!canBlink(manual)) return false;
      // Commands replace a pending/ongoing automatic blink, never stack timers.
      stop();
      element.style.visibility = "visible";
      element.dataset.blinkCause = manual ? "manual" : "auto";
      if (request) element.dataset.blinkRequest = String(request.id);
      const plan = sampleEyeBlinkPlan(Math.random);
      const advance = (step: number) => {
        if (!canBlink(manual)) { stop(); return; }
        const current = plan.steps[step]!;
        showFrame(current.frame);
        if (step < plan.steps.length - 1) {
          timer = window.setTimeout(() => advance(step + 1), current.holdMs);
        } else {
          // One manual click is exactly one blink. Autonomy resumes afterwards
          // only when running; a paused field stays open until the next command.
          schedule(manual || secondOfPair ? 2600 + Math.random() * 4200 : plan.nextDelayMs,
            !manual && !secondOfPair && plan.isDoubleBlink);
        }
      };
      advance(0);
      return true;
    };
    const schedule = (delay: number, secondOfPair = false) => {
      if (!canBlink()) return;
      timer = window.setTimeout(() => blink(false, secondOfPair), delay);
    };
    const resume = () => {
      stop();
      // Reduced motion disables autoplay without switching to a different crop.
      element.style.visibility = loaded ? "visible" : "hidden";
      schedule(sampleFirstBlinkDelay(Math.random));
    };
    const image = new Image();
    image.onload = () => {
      if (!disposed) {
        loaded = true;
        element.dataset.loadedSource = source;
        resume();
      }
    };
    // Warm the bounded 80-sheet collection while cells are empty, so entering
    // bubbles already have the same photograph used throughout their lifetime.
    if (loaded) resume();
    else image.src = source;
    const unregister = controller.register(index, (request) => blink(true, false, request));
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", resume);
    return () => {
      disposed = true;
      stop();
      image.onload = null;
      unregister();
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", resume);
    };
  }, [active, controller, index, paused, source]);

  const image = `${gradient ?? "linear-gradient(transparent, transparent)"}, url("${source}")`;
  const photograph = {
    backgroundImage: image,
    backgroundBlendMode: gradient ? "color, normal" : "normal",
    backgroundSize: "100% 100%, 300% 200%",
    backgroundPosition: "center, 0% 0%",
    backgroundRepeat: "no-repeat",
  };

  return <span ref={surface} data-tech-eye-blink={index} style={{
    position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none",
    ...photograph,
  }}>
    <span ref={eyelid} style={{
      position: "absolute", inset: 0, ...photograph,
      // Keep the surrounding photograph still. Feather only the eyelid region
      // so generated frame-to-frame skin/eyebrow drift does not move the face.
      maskImage: "radial-gradient(ellipse 44% 26% at 50% 53%, #000 65%, transparent 100%)",
    }} />
  </span>;
}
