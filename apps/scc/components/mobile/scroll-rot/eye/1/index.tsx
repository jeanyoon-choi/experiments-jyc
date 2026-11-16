"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createEye } from "./scene";
import { Icon } from "./reels/glyph";
import { compactCount, reelOf } from "./reels/feed";
import s from "./reels/reels.module.css";

export default function EyeOne() {
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(0);
  const [liked, setLiked] = useState<number[]>([]);
  const [reposted, setReposted] = useState<number[]>([]);
  const [burst, setBurst] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const scene = createEye(host.current!, track.current!, {
      // synchronous: the scene moves its canvas into the page in the same frame
      onLive: (reel) => {
        current.current = reel;
        flushSync(() => setLive(reel));
      },
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
