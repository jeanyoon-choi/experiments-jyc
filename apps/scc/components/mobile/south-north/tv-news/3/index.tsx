"use client";

import { useEffect, useRef, useState } from "react";
import { Flags } from "./flags";
import { createNewsMorph } from "./morph/renderer";
import { loadTrack, plainTrack, type MorphTrack } from "./morph/track";
import { createPager } from "./pager";
import { PANELS } from "./panels";
import { compactCount, reelOf } from "./reels/feed";
import { Icon } from "./reels/glyph";
import { createVoices } from "./sound";
import { LEVEL_SAMPLES, leanOf, northShare, pitchOf } from "./tilt";
import styles from "./screen.module.css";

type MotionState = "waiting" | "ask" | "on" | "denied";
type PermissionRequest = () => Promise<"granted" | "denied">;
type FrameMetadata = { mediaTime: number };
type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: FrameMetadata) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};
/** One reel's picture, once its track, its still and its WebGL program exist. */
type Field = {
  morph: ReturnType<typeof createNewsMorph>;
  frameAt: (seconds: number) => number;
  observer: ResizeObserver;
  still: HTMLImageElement;
  gl: WebGL2RenderingContext;
};

/** Reels this far from the one on screen exist, each with a canvas and its still. */
const REACH = 2;
/** Video elements that take turns: the reel on screen and the one on either side of it. */
const POOL = 3;
const SLOTS = Array.from({ length: POOL }, (_, slot) => slot);

/** The feed has no end: reel n shows part n of the list, round and round. */
const panelOf = (reel: number) => PANELS[reel % PANELS.length];

const permissionRequest = () => (
  typeof DeviceOrientationEvent !== "undefined"
    ? (DeviceOrientationEvent as unknown as { requestPermission?: PermissionRequest }).requestPermission
    : undefined
);

export default function TvNewsThree() {
  const hostRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const flagRef = useRef<HTMLSpanElement>(null);
  /** −1 all the way south, +1 all the way north; null until a tilt or a key says so. */
  const leanRef = useRef<number | null>(null);
  const sensedRef = useRef(false);
  const unlockRef = useRef<(() => void) | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const arrangeRef = useRef<((centre: number) => void) | null>(null);
  const askingRef = useRef(false);
  const [motion, setMotion] = useState<MotionState>("waiting");
  /** The reel the feed rests on. */
  const [live, setLive] = useState(0);
  /** Parts of the list the viewer has liked or reposted. */
  const [liked, setLiked] = useState<number[]>([]);
  const [reposted, setReposted] = useState<number[]>([]);

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
    unlockRef.current?.();
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
    const host = hostRef.current;
    const track = trackRef.current;
    const canvases = canvasRefs.current;
    const videos = videoRefs.current as FrameVideo[];
    if (!host || !track || SLOTS.some((slot) => !videos[slot])) return;

    let mounted = true;
    const voices = createVoices(videos);

    // --- the videos ----------------------------------------------------------
    // As a feed does it: the reel on screen plays, and the one on either side
    // is already loaded and waiting on its first frame, so that a swipe starts
    // it at once. Reel n uses element n mod 3; neighbours never share one.
    /** The reel each element holds, and whether its first picture has come. */
    const held: number[] = SLOTS.map((slot) => (slot === 0 ? 0 : -1));
    const fresh = SLOTS.map(() => false);
    /** The reel that plays: the one the feed is on, or is on its way to. */
    let playing = 0;
    /** A video the browser would only start silent; the next touch gives it its sound back. */
    let silenced = false;
    let touched = false;

    const hold = (reel: number) => {
      const slot = reel % POOL;
      if (reel < 0 || held[slot] === reel) return;
      held[slot] = reel;
      fresh[slot] = false;
      const video = videos[slot];
      video.pause();
      video.src = panelOf(reel).video;
      video.load();
    };
    /** Starts the playing reel's video, silent if the browser will not have it otherwise. */
    const kick = () => {
      const video = videos[playing % POOL];
      void video.play().catch((error: unknown) => {
        if (!(error instanceof DOMException) || error.name !== "NotAllowedError" || video.muted) return;
        video.muted = true;
        silenced = true;
        void video.play().catch(() => undefined);
      });
    };

    // --- the pictures --------------------------------------------------------
    const fields = new Map<number, Field>();
    /** Reels being made, by the number of their making: a late track must not land in a reel since let go. */
    const making = new Map<number, number>();
    let makings = 0;
    const tracks = new Map<string, Promise<MorphTrack>>();
    const trackOf = (folder: string | undefined) => {
      if (!folder) return Promise.resolve(plainTrack());
      let track = tracks.get(folder);
      if (!track) {
        track = loadTrack(folder);
        tracks.set(folder, track);
      }
      return track;
    };

    const prepare = (reel: number) => {
      const canvas = canvases.get(reel);
      if (!canvas || making.has(reel)) return;
      const mine = makings += 1;
      making.set(reel, mine);
      const panel = panelOf(reel);
      const gl = canvas.getContext("webgl2", { alpha: false, antialias: true, powerPreference: "high-performance" });
      if (!gl) return;
      const still = new Image();
      still.decoding = "async";
      still.src = panel.still;
      void trackOf(panel.track).then((track) => {
        if (!mounted || making.get(reel) !== mine) return;
        let morph: Field["morph"];
        try {
          morph = createNewsMorph(gl, track);
        } catch (error) {
          console.error(error);
          return;
        }
        const resize = () => {
          const bounds = canvas.getBoundingClientRect();
          morph.resize(Math.max(1, bounds.width), Math.max(1, bounds.height));
        };
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();
        // Each decoded picture arrives with its own media time, which names
        // the frame the points were measured on.
        const frameAt = (seconds: number) => Math.round(seconds * track.fps) % track.frames;
        fields.set(reel, { morph, frameAt, observer, still, gl });
        // Until its video plays, a reel shows the frame the video starts from.
        const showStill = () => {
          if (mounted && fields.get(reel)?.morph === morph && !(reel === playing && fresh[reel % POOL])) morph.setStill(still, 0);
        };
        if (still.complete) showStill();
        else still.addEventListener("load", showStill, { once: true });
      }, (error) => console.error(error));
    };
    const release = (reel: number) => {
      making.delete(reel);
      const field = fields.get(reel);
      if (!field) return;
      fields.delete(reel);
      field.observer.disconnect();
      field.morph.destroy();
      field.gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    arrangeRef.current = (centre) => {
      for (let reel = Math.max(0, centre - REACH); reel <= centre + REACH; reel += 1) prepare(reel);
      for (const reel of [...making.keys()]) if (Math.abs(reel - centre) > REACH) release(reel);
    };

    /** Makes `reel` the one that plays, from its first frame; the one it takes over from waits on its own first frame again. */
    const start = (reel: number) => {
      if (reel !== playing) {
        const before = playing;
        const old = videos[before % POOL];
        old.pause();
        if (held[before % POOL] === before && old.readyState > 0) old.currentTime = 0;
        const left = fields.get(before);
        left?.morph.setStill(left.still, 0);
        playing = reel;
        hold(reel);
        voices.setActive(reel % POOL);
      }
      kick();
    };

    const precise = typeof videos[0].requestVideoFrameCallback === "function";
    const handles = SLOTS.map(() => 0);
    const shownTime = SLOTS.map(() => -1);
    const listeners = SLOTS.map((slot) => {
      const video = videos[slot];
      const onLoaded = () => { fresh[slot] = true; };
      // A reel that has played to its end hands over to the next one; held
      // under a finger it plays again.
      const onEnded = () => {
        if (held[slot] !== playing) return;
        if (!pager.step(1)) {
          video.currentTime = 0;
          kick();
        }
      };
      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("ended", onEnded);
      if (video.readyState >= 2) fresh[slot] = true;
      const onVideoFrame = (_now: number, metadata: FrameMetadata) => {
        const reel = held[slot];
        const field = fields.get(reel);
        if (reel === playing && fresh[slot] && field) field.morph.setFrame(video, field.frameAt(metadata.mediaTime));
        handles[slot] = video.requestVideoFrameCallback!(onVideoFrame);
      };
      if (precise) handles[slot] = video.requestVideoFrameCallback!(onVideoFrame);
      return () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("ended", onEnded);
        if (handles[slot]) video.cancelVideoFrameCallback?.(handles[slot]);
      };
    });

    const pager = createPager(host, track, {
      // The page is decided when the finger lets go: its video starts then,
      // while the page is still sliding in.
      onTarget: (page) => start(page),
      onRest: (page) => {
        start(page);
        hold(page + 1);
        hold(page - 1);
        setLive(page);
      },
    });
    // The first element starts by its attribute, before this code runs; from
    // here on nothing may start by itself when it is handed a new reel.
    SLOTS.forEach((slot) => { videos[slot].autoplay = false; });
    hold(1);
    kick();

    // Sound, and the right to start a video with sound later without a touch,
    // come from a finished touch or a key (a touch only just begun does not
    // count, and unmuting on it stops the video).
    const unlock = () => {
      if (!voices.unlock()) return;
      if (touched && !silenced) return;
      touched = true;
      silenced = false;
      SLOTS.forEach((slot) => {
        const video = videos[slot];
        video.muted = false;
        if (slot === playing % POOL || held[slot] < 0) return;
        // Started inside the touch and stopped again: the element may now
        // start by itself when its reel comes up.
        void video.play().then(() => {
          if (slot === playing % POOL) return;
          video.pause();
          video.currentTime = 0;
        }).catch(() => undefined);
      });
      kick();
    };
    unlockRef.current = unlock;

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
    const heldKeys = new Set<string>();
    const keyLean = () => (heldKeys.has("ArrowUp") ? 1 : 0) - (heldKeys.has("ArrowDown") ? 1 : 0);
    const down = (event: KeyboardEvent) => {
      unlock();
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      heldKeys.add(event.key);
      leanRef.current = keyLean();
    };
    const up = (event: KeyboardEvent) => {
      if (!heldKeys.delete(event.key)) return;
      if (!sensedRef.current) leanRef.current = keyLean();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerup", unlock);

    let frame = 0;
    let last = performance.now();
    let clock = 0;
    let share = 0.5;
    let flagShare = -1;
    let watched = 0;
    const render = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += delta;
      const at = Math.max(0, pager.tick(now));
      // Before the first tilt or key the picture drifts slowly from one side
      // to the other and back.
      const lean = leanRef.current ?? Math.sin(clock * 0.45);
      share += (northShare(lean) - share) * (1 - Math.exp(-delta * 7));

      const slot = playing % POOL;
      const video = videos[slot];
      const field = fields.get(playing);
      if (!precise && field && fresh[slot] && held[slot] === playing && video.currentTime !== shownTime[slot]) {
        shownTime[slot] = video.currentTime;
        field.morph.setFrame(video, field.frameAt(video.currentTime));
      }
      // Whatever stopped the playing video (another video's start, a tab left
      // and come back to), it is started again.
      if (now - watched > 400) {
        watched = now;
        if (video.paused && !video.ended && !document.hidden && held[slot] === playing) kick();
      }

      const upper = Math.floor(at);
      fields.get(upper)?.morph.draw(share);
      if (at > upper) fields.get(upper + 1)?.morph.draw(share);
      voices.setShare(share);
      // The flag in the corner is mixed by the same share as the picture.
      if (Math.abs(share - flagShare) > 0.002) {
        flagShare = share;
        flagRef.current?.style.setProperty("--share", share.toFixed(3));
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      mounted = false;
      window.clearTimeout(kickoff);
      cancelAnimationFrame(frame);
      pager.dispose();
      listeners.forEach((remove) => remove());
      arrangeRef.current = null;
      for (const reel of [...making.keys()]) release(reel);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerup", unlock);
      unlistenRef.current?.();
      unlistenRef.current = null;
      unlockRef.current = null;
      voices.close();
    };
  }, []);

  // Canvases come and go with the reel on screen; their pictures follow.
  useEffect(() => {
    arrangeRef.current?.(live);
  }, [live]);

  const toggle = (part: number, set: (update: (list: number[]) => number[]) => void) => (
    set((list) => (list.includes(part) ? list.filter((other) => other !== part) : [...list, part]))
  );
  const reels: number[] = [];
  for (let reel = Math.max(0, live - REACH); reel <= live + REACH; reel += 1) reels.push(reel);

  return (
    <main className={styles.stage}>
      {SLOTS.map((slot) => (
        <video
          key={slot}
          ref={(element) => { videoRefs.current[slot] = element; }}
          className={styles.source}
          src={slot === 0 ? PANELS[0].video : undefined}
          muted
          playsInline
          autoPlay={slot === 0}
          preload="auto"
        />
      ))}
      <div ref={hostRef} className={styles.scroller}>
        <div ref={trackRef} className={styles.track}>
          {reels.map((reel) => {
            const part = reel % PANELS.length;
            const panel = PANELS[part];
            const counts = reelOf(part);
            const isLiked = liked.includes(part);
            const isReposted = reposted.includes(part);
            return (
              <section key={reel} className={styles.reel} style={{ top: `${reel * 100}%` }}>
                <div className={styles.column}>
                  <canvas
                    ref={(element) => {
                      if (element) canvasRefs.current.set(reel, element);
                      else canvasRefs.current.delete(reel);
                    }}
                    className={styles.canvas}
                    role="img"
                    aria-label={`${panel.label} 모바일 윗변을 몸에서 멀리 기울이면 북의 화면이, 몸 쪽으로 기울이면 남의 화면이 되고, 그 사이에서는 둘이 섞인다.`}
                  />
                  <div className={styles.side}>
                    <button type="button" aria-label={isLiked ? "좋아요 취소" : "좋아요"} aria-pressed={isLiked} className={isLiked ? styles.liked : undefined} onClick={() => toggle(part, setLiked)}>
                      <Icon name="heart" size={28} filled={isLiked} />
                      <small>{compactCount(counts.likes + Number(isLiked))}</small>
                    </button>
                    <button type="button" aria-label="댓글">
                      <Icon name="message" size={28} />
                      <small>{compactCount(counts.comments)}</small>
                    </button>
                    <button type="button" aria-label={isReposted ? "리포스트 취소" : "리포스트"} aria-pressed={isReposted} onClick={() => toggle(part, setReposted)}>
                      <Icon name="repost" size={28} filled={isReposted} />
                      <small>{compactCount(counts.reposts + Number(isReposted))}</small>
                    </button>
                    <button type="button" aria-label="공유">
                      <Icon name="send" size={28} />
                      <small>{compactCount(counts.shares)}</small>
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <div className={styles.frame}>
        <Flags ref={flagRef} />
      </div>
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
