"use client";

import { useEffect, useRef, useState } from "react";
import { Flags } from "./flags";
import { WORK_INFO } from "./info";
import { createNewsMorph } from "./morph/renderer";
import { loadTrack } from "./morph/track";
import { createVoices } from "./sound";
import { LEVEL_SAMPLES, leanOf, northShare, pitchOf } from "./tilt";
import styles from "./screen.module.css";

// The footage and its track are /1's own files, served once for both.
const ASSETS = "/video/south-north/tv-news/1";

type MotionState = "waiting" | "ask" | "on" | "denied";
type PermissionRequest = () => Promise<"granted" | "denied">;
type FrameMetadata = { mediaTime: number };
type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: FrameMetadata) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const permissionRequest = () => (
  typeof DeviceOrientationEvent !== "undefined"
    ? (DeviceOrientationEvent as unknown as { requestPermission?: PermissionRequest }).requestPermission
    : undefined
);

export default function TvNewsTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flagRef = useRef<HTMLSpanElement>(null);
  /** −1 all the way south, +1 all the way north; null until a tilt or a key says so. */
  const leanRef = useRef<number | null>(null);
  const sensedRef = useRef(false);
  const voicesRef = useRef<ReturnType<typeof createVoices> | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const askingRef = useRef(false);
  const [motion, setMotion] = useState<MotionState>("waiting");
  const [infoOpen, setInfoOpen] = useState(false);

  const listen = () => {
    // The angle the mobile is held at when the reading starts is level.
    let level: number | null = null;
    let gathered = 0;
    let sum = 0;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null && event.beta === null) return;
      const pitch = pitchOf(event, screen.orientation?.angle ?? 0);
      if (level === null) {
        sum += pitch;
        gathered += 1;
        if (gathered < LEVEL_SAMPLES) return;
        level = sum / gathered;
      }
      sensedRef.current = true;
      leanRef.current = leanOf(pitch, level);
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  };

  const enable = async () => {
    if (askingRef.current) return;
    askingRef.current = true;
    voicesRef.current?.unlock();
    const request = permissionRequest();
    try {
      if (request && (await request()) !== "granted") {
        setMotion("denied");
        return;
      }
    } catch {
      setMotion("denied");
      return;
    } finally {
      askingRef.current = false;
    }
    unlistenRef.current?.();
    unlistenRef.current = listen();
    setMotion("on");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current as FrameVideo | null;
    if (!canvas || !video) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true, powerPreference: "high-performance" });
    if (!gl) return;

    const voices = createVoices(video);
    voicesRef.current = voices;
    void video.play().catch(() => undefined);

    // iOS asks for motion access on a tap; elsewhere the pitch arrives on its
    // own. A desktop has no gyroscope to ask for: it uses the arrow keys.
    const kickoff = window.setTimeout(() => {
      if (permissionRequest() && window.matchMedia("(pointer: coarse)").matches) setMotion("ask");
      else {
        unlistenRef.current = listen();
        setMotion("on");
      }
    }, 0);

    // Without a gyroscope, hold ↑ for the North or ↓ for the South.
    const held = new Set<string>();
    const keyLean = () => (held.has("ArrowUp") ? 1 : 0) - (held.has("ArrowDown") ? 1 : 0);
    const down = (event: KeyboardEvent) => {
      voices.unlock();
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      held.add(event.key);
      leanRef.current = keyLean();
    };
    const up = (event: KeyboardEvent) => {
      if (!held.delete(event.key)) return;
      if (!sensedRef.current) leanRef.current = keyLean();
    };
    const unlock = () => voices.unlock();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerdown", unlock);

    let mounted = true;
    let frame = 0;
    let videoFrame = 0;
    let morph: ReturnType<typeof createNewsMorph> | null = null;
    let observer: ResizeObserver | null = null;

    void loadTrack(ASSETS).then((track) => {
      if (!mounted) return;
      try {
        morph = createNewsMorph(gl, track);
      } catch (error) {
        console.error(error);
        return;
      }
      const field = morph;
      const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        field.resize(Math.max(1, bounds.width), Math.max(1, bounds.height));
      };
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      // Each decoded picture arrives with its own media time, which names the
      // frame the points were measured on.
      const frameAt = (seconds: number) => Math.round(seconds * track.fps) % track.frames;
      const precise = typeof video.requestVideoFrameCallback === "function";
      const onVideoFrame = (_now: number, metadata: FrameMetadata) => {
        field.setFrame(video, frameAt(metadata.mediaTime));
        videoFrame = video.requestVideoFrameCallback!(onVideoFrame);
      };
      if (precise) videoFrame = video.requestVideoFrameCallback!(onVideoFrame);

      let last = performance.now();
      let clock = 0;
      let share = 0.5;
      let shownTime = -1;
      let flagShare = -1;
      const render = (now: number) => {
        const delta = Math.min(0.1, (now - last) / 1000);
        last = now;
        clock += delta;
        if (!precise && video.currentTime !== shownTime) {
          shownTime = video.currentTime;
          field.setFrame(video, frameAt(shownTime));
        }
        // Before the first tilt or key the picture drifts slowly from one
        // broadcast to the other and back.
        const lean = leanRef.current ?? Math.sin(clock * 0.45);
        share += (northShare(lean) - share) * (1 - Math.exp(-delta * 7));
        field.draw(share);
        voices.setShare(share);
        // The flag in the corner is mixed by the same share as the picture.
        if (Math.abs(share - flagShare) > 0.002) {
          flagShare = share;
          flagRef.current?.style.setProperty("--share", share.toFixed(3));
        }
        frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);
    }, (error) => console.error(error));

    return () => {
      mounted = false;
      window.clearTimeout(kickoff);
      cancelAnimationFrame(frame);
      if (videoFrame) video.cancelVideoFrameCallback?.(videoFrame);
      observer?.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", unlock);
      unlistenRef.current?.();
      unlistenRef.current = null;
      voices.close();
      voicesRef.current = null;
      morph?.destroy();
    };
  }, []);

  return (
    <main className={styles.stage}>
      <video ref={videoRef} className={styles.source} src={`${ASSETS}/news.mp4`} muted loop playsInline autoPlay preload="auto" />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="MBC 뉴스데스크와 조선중앙텔레비죤 보도의 앵커가 한 화면에서 합쳐진다. 모바일 윗변을 몸에서 멀리 기울이면 북의 방송이, 몸 쪽으로 기울이면 남의 방송이 되고, 그 사이에서는 두 앵커의 얼굴과 목소리가 섞인다."
      />
      <div className={styles.frame}>
        <Flags ref={flagRef} />
        <button type="button" className={styles.info} aria-label="작품 정보" onClick={() => setInfoOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="7" r="1.6" />
            <rect x="10.7" y="10.2" width="2.6" height="8.4" rx="1.3" />
          </svg>
        </button>
      </div>
      {infoOpen && (
        <button type="button" className={styles.ask} onClick={() => setInfoOpen(false)}>
          <span className={styles.askCard} role="dialog" aria-label="작품 정보">
            <span className={styles.askText}>
              {WORK_INFO.lines.map((line) => <span key={line} className={styles.infoLine}>{line}</span>)}
              <span className={styles.infoNote}>{WORK_INFO.note}</span>
            </span>
            <span className={styles.askButton}>닫기</span>
          </span>
        </button>
      )}
      {(motion === "ask" || motion === "denied") && (
        // iOS hands out motion access on a tap: the whole screen takes it.
        <button type="button" className={styles.ask} onClick={() => { void enable(); }}>
          <span className={styles.askCard}>
            <span className={styles.askText}>
              {motion === "denied" ? "설정에서 ‘동작 및 방향 접근’을 허용한 뒤 다시 눌러 주세요" : "위아래로 기울여 보세요"}
            </span>
            <span className={styles.askButton}>{motion === "denied" ? "다시 시도" : "확인"}</span>
          </span>
        </button>
      )}
    </main>
  );
}
