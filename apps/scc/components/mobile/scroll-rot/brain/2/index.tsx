"use client";

/* eslint-disable @next/next/no-img-element -- one small cut-out, drawn at its own size */
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createBrain } from "./scene";
import { Icon } from "./reels/glyph";
import { compactCount, reelOf } from "./reels/feed";
import s from "./reels/reels.module.css";

// From the twentieth swipe on, every tenth (20, 30, 40, …) lands on Mark Zuckerberg's face where the brain would be.
// Photo: The White House / Andrea Hanks, public domain (see public/images/scroll-rot/license.txt).
const FACE_FROM = 20;
const FACE_EVERY = 10;
const FACE_URL = "/images/scroll-rot/face.webp";
const isFace = (reel: number) => reel >= FACE_FROM && reel % FACE_EVERY === 0;

export default function BrainTwo() {
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(0);
  const [liked, setLiked] = useState<number[]>([]);
  const [reposted, setReposted] = useState<number[]>([]);
  const [burst, setBurst] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const scene = createBrain(host.current!, track.current!, {
      // synchronous: the scene moves its canvas into the page in the same frame
      onLive: (reel) => {
        current.current = reel;
        flushSync(() => setLive(reel));
      },
      isOther: isFace,
      onDoubleTap: () => {
        const n = current.current;
        setLiked((list) => (list.includes(n) ? list : [...list, n]));
        setBurst((value) => value + 1);
      },
    });
    return () => scene.dispose();
  }, []);

  const toggle = (n: number, set: typeof setLiked) => set((list) => (list.includes(n) ? list.filter((x) => x !== n) : [...list, n]));

  return (
    <main className={s.page}>
      <div ref={host} className={s.scroller}>
        <div ref={track} className={s.track}>
        {[live - 2, live - 1, live, live + 1, live + 2].filter((n) => n >= 0).map((n) => {
          const reel = reelOf(n);
          const isLiked = liked.includes(n);
          const isReposted = reposted.includes(n);
          return (
            <section key={n} data-reel={n} className={s.reel} style={{ top: `${n * 100}%` }}>
              <div data-live />
              <canvas data-still className={s.still} />
              {isFace(n) && <div className={s.face}><img src={FACE_URL} alt="Mark Zuckerberg" draggable={false} /></div>}
              <div className={s.side}>
                <button aria-label={isLiked ? "Unlike reel" : "Like reel"} aria-pressed={isLiked} className={isLiked ? s.liked : ""} onClick={() => toggle(n, setLiked)}>
                  <Icon name="heart" size={28} filled={isLiked} />
                  <small>{compactCount(reel.likes + Number(isLiked))}</small>
                </button>
                <button aria-label="View reel comments">
                  <Icon name="message" size={28} />
                  <small>{compactCount(reel.comments)}</small>
                </button>
                <button aria-label={isReposted ? "Undo repost" : "Repost"} aria-pressed={isReposted} onClick={() => toggle(n, setReposted)}>
                  <Icon name="repost" size={28} filled={isReposted} />
                  <small>{compactCount(reel.reposts + Number(isReposted))}</small>
                </button>
                <button aria-label="Share reel">
                  <Icon name="send" size={28} />
                  <small>{compactCount(reel.shares)}</small>
                </button>
              </div>
            </section>
          );
        })}
        </div>
      </div>
      {burst > 0 && <span key={burst} className={s.burst}><Icon name="heart" filled size={96} /></span>}
    </main>
  );
}
