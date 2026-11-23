// The swipe between parts: a pager that follows the finger and settles on a
// page with a spring, as a native feed does. A browser's scroll snap does not
// (on iOS it has no flick, only a drift to the nearest page). The logic and
// the constants are copied from scroll-rot/eye/2's scene (nothing imported):
//   - the page follows the finger exactly, from the first point past the slop;
//   - a flick of 300 px/s turns the page however short the drag; slower, the
//     nearer page wins; one page a flick;
//   - the release hands its speed to a spring (UIScrollView's paging
//     deceleration): once a millisecond, v = (v + (target − x)·pull)·friction;
//   - a finger put down mid-flight catches the page where it is.

const PULL = 0.000284858;
const FRICTION = 0.970815;
const FLICK = 0.3; // px/ms
const SLOP = 10; // px before a touch becomes a drag
const BAND = 0.55; // the rubber band above the first page
const REST = 0.06; // of a page height: this near a page already counts as on it

export type PagerHooks = {
  /** The page the track is now being pulled to: decided at the release, before it gets there. */
  onTarget: (page: number) => void;
  /** The track has come to rest on a page. */
  onRest: (page: number) => void;
};

export function createPager(host: HTMLElement, track: HTMLElement, hooks: PagerHooks) {
  let pos = 0; // px
  let vel = 0; // px/ms
  let target: number | null = null; // px, while the spring runs
  let shown = Number.NaN;
  let rested = 0;
  let h = host.clientHeight || 1;
  let last = performance.now();

  const observer = new ResizeObserver(() => {
    const before = h;
    h = host.clientHeight || 1;
    if (h === before) return;
    pos = (pos / before) * h;
    if (target !== null) target = Math.round(target / before) * h;
  });
  observer.observe(host);

  let pointer: number | null = null;
  let mode: "none" | "page" | "aside" = "none";
  let downX = 0;
  let downY = 0;
  let anchorY = 0;
  let anchorPos = 0;
  let dragged = false; // this gesture moved the page: its click must not press a button
  const trail: { y: number; t: number }[] = [];

  const capture = (id: number) => {
    try {
      host.setPointerCapture(id);
    } catch {
      // a synthetic or already released pointer: the drag still works without capture
    }
  };
  const band = (x: number) => (1 - 1 / ((x * BAND) / h + 1)) * h;
  const take = (y: number) => {
    mode = "page";
    dragged = true;
    anchorY = y;
    anchorPos = pos;
    trail.length = 0;
  };
  const pull = (page: number) => {
    const next = Math.max(0, page);
    target = next * h;
    hooks.onTarget(next);
  };
  /** Let go: the spring takes the track to a page, with the speed it was left at. */
  const release = (speed: number) => {
    const page = pos / h;
    pull(speed > FLICK ? Math.floor(page) + 1 : speed < -FLICK ? Math.ceil(page) - 1 : Math.round(page));
    vel = pos < 0 ? 0 : speed;
  };

  const onDown = (event: PointerEvent) => {
    if (pointer !== null) return;
    pointer = event.pointerId;
    mode = "none";
    dragged = false;
    downX = event.clientX;
    downY = event.clientY;
    if (target !== null) {
      // caught in flight: the page stops under the finger and is dragged from there
      target = null;
      vel = 0;
      capture(event.pointerId);
      take(event.clientY);
    }
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (mode === "none") {
      const mx = event.clientX - downX;
      const my = event.clientY - downY;
      if (Math.hypot(mx, my) < SLOP) return;
      if (Math.abs(mx) > Math.abs(my)) {
        mode = "aside";
        return;
      }
      capture(event.pointerId);
      take(event.clientY); // from here, not from the touch: the page never jumps to catch up
    }
    if (mode !== "page") return;
    const raw = anchorPos - (event.clientY - anchorY);
    pos = raw < 0 ? -band(-raw) : raw;
    trail.push({ y: event.clientY, t: event.timeStamp });
    while (trail.length > 2 && event.timeStamp - trail[0].t > 100) trail.shift();
  };
  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
    if (mode === "page") {
      const first = trail[0];
      const end = trail[trail.length - 1];
      // a finger that stopped before lifting throws nothing
      const moving = first && end && end.t > first.t && event.timeStamp - end.t < 60;
      release(moving ? Math.min(6, Math.max(-6, -(end.y - first.y) / (end.t - first.t))) : 0);
    }
    mode = "none";
  };
  const onClick = (event: MouseEvent) => {
    if (!dragged) return;
    event.stopPropagation();
    event.preventDefault();
  };

  /** Turns one page, unless a finger holds the track or it is already on its way. */
  const step = (by: number) => {
    if (target !== null || pointer !== null) return false;
    pull(Math.round(pos / h) + by);
    return true;
  };
  // A desktop: the wheel turns one page. (↑ and ↓ are the tilt there.)
  let wheelLock = 0;
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const now = performance.now();
    if (now < wheelLock || Math.abs(event.deltaY) < 20) return;
    wheelLock = now + 450;
    step(event.deltaY > 0 ? 1 : -1);
  };
  const onKey = (event: KeyboardEvent) => {
    const by = event.key === "PageDown" || event.key === " " ? 1 : event.key === "PageUp" ? -1 : 0;
    if (!by) return;
    event.preventDefault();
    step(by);
  };

  host.addEventListener("click", onClick, true);
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  host.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);

  return {
    /** Moves the track for this frame; returns where it stands, in pages. */
    tick(now: number) {
      const gap = now - last;
      last = now;
      if (target !== null) {
        for (let ms = Math.min(64, Math.max(1, Math.round(gap))); ms > 0; ms -= 1) {
          vel = (vel + (target - pos) * PULL) * FRICTION;
          pos += vel;
        }
        if (Math.abs(target - pos) < 0.3 && Math.abs(vel) < 0.005) {
          pos = target;
          vel = 0;
          target = null;
        }
      }
      if (pos !== shown) {
        shown = pos;
        track.style.transform = `translate3d(0,${-pos}px,0)`;
      }
      const near = Math.max(0, Math.round(pos / h));
      if (near !== rested && Math.abs(pos - near * h) < Math.max(1, h * REST)) {
        rested = near;
        hooks.onRest(near);
      }
      return pos / h;
    },
    step,
    dispose() {
      observer.disconnect();
      host.removeEventListener("click", onClick, true);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    },
  };
}
