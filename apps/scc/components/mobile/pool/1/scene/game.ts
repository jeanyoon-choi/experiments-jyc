import { advance, createTable, cueBall, isMoving, resize, strike, trace, ON_TABLE } from "../model/physics";
import type { Table } from "../model/physics";
import { createStage } from "./stage";
import type { CuePose } from "./stage";
import { createSound } from "./sound";

/** A pull shorter than this (CSS px) leaves the cue where it lies. */
const MIN_PULL = 10;
/** Full power at this share of the screen's short side. */
const FULL_PULL = 0.42;
/** The cue's tip rests this far behind the ball, and draws back this much more at full power (m). */
const CUE_GAP = 0.014;
const CUE_DRAW = 0.2;
const STROKE_SECONDS = 0.075;
const FOLLOW_SECONDS = 0.18;
/** While balls roll the cue is drawn back off the table along its own line, and returns when they rest. */
const AWAY = 2.4;
const AWAY_SECONDS = 0.4;

/**
 * Runs the game on a canvas that fills `page`. `onSound` hears whether the browser lets sound out;
 * `unlock` is for the tap that asks it to.
 */
export function mount(page: HTMLElement, canvas: HTMLCanvasElement, onSound: (open: boolean) => void) {
  let table: Table | null = null;
  // The table's own sounds, and every ball that goes down a pocket is told it is fired.
  const sound = createSound("/3d/pool/table.mp3", "/3d/pool/youre-fired.mp3", onSound);
  let heard = 0;
  let frame = 0;
  let last = 0;
  let alive = true;
  // The cue always lies on a line through the cue ball; this is that line.
  const aim = { ux: 0, uy: 1 };
  // 0 with the cue at the ball, 1 with it withdrawn off the table.
  let away = 0;
  // The shot being drawn back: the pointer, where it went down, and the pull in table axes.
  let pull: { id: number; x: number; y: number; size: number } | null = null;
  // The cue on its way to the ball, then resting where it struck.
  let stroke: { power: number; time: number; struck: boolean } | null = null;

  const power = (size: number) => {
    const short = Math.min(page.clientWidth, page.clientHeight);
    return Math.min(1, size / (FULL_PULL * short)) ** 1.35;
  };

  const paint = () => {
    if (!table) return;
    let pose: CuePose | null = null;
    if (away < 1) {
      let back = CUE_GAP;
      let guide = false;
      if (stroke) {
        const t = Math.min(1, stroke.time / STROKE_SECONDS);
        back = (CUE_GAP + stroke.power * CUE_DRAW) * (1 - t * t);
      } else if (pull && pull.size >= MIN_PULL) {
        back = CUE_GAP + power(pull.size) * CUE_DRAW;
        guide = true;
        const end = trace(table, aim.ux, aim.uy);
        stage.traceEnd.x = end.x;
        stage.traceEnd.y = end.y;
      }
      const eased = away * away * (3 - 2 * away);
      pose = { ux: aim.ux, uy: aim.uy, back: back + eased * AWAY, guide };
    }
    stage.render(table, pose, true);
  };

  /** Points the resting cue at the nearest ball, as a player would walk round to it. */
  const address = () => {
    if (!table) return;
    const white = cueBall(table);
    let best = Infinity;
    for (const ball of table.balls) {
      if (ball.id === 0 || ball.state !== ON_TABLE) continue;
      const d = Math.hypot(ball.x - white.x, ball.y - white.y);
      if (d < best) {
        best = d;
        aim.ux = (ball.x - white.x) / d;
        aim.uy = (ball.y - white.y) / d;
      }
    }
  };

  const loop = (now: number) => {
    frame = 0;
    if (!alive || !table) return;
    const seconds = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (stroke) {
      stroke.time += seconds;
      if (!stroke.struck && stroke.time >= STROKE_SECONDS) {
        stroke.struck = true;
        strike(table, aim.ux, aim.uy, stroke.power);
        sound.strike(stroke.power);
      }
      if (stroke.time >= STROKE_SECONDS + FOLLOW_SECONDS) stroke = null;
    }
    const wasMoving = isMoving(table);
    const moving = wasMoving && advance(table, seconds);
    sound.frame();
    for (const hit of table.hits) sound.hit(hit.kind, hit.speed);
    table.hits.length = 0;
    // After the ball's own drop into the pocket.
    for (let n = 0; heard < table.drops; n += 1, heard += 1) sound.fired(0.12 + n * 0.18);
    let rolling = 0;
    if (moving) for (const ball of table.balls) if (ball.state === ON_TABLE) rolling += Math.hypot(ball.vx, ball.vy);
    sound.roll(rolling);
    if (wasMoving && !moving) address();
    // Out of the way while anything rolls, back to the ball once it has all stopped.
    const target = moving && !stroke ? 1 : moving ? away : 0;
    if (away !== target) away = target > away ? Math.min(target, away + seconds / AWAY_SECONDS) : Math.max(target, away - seconds / AWAY_SECONDS);
    paint();
    if ((moving || stroke || away !== target) && !document.hidden) frame = requestAnimationFrame(loop);
  };
  const run = () => {
    if (frame || !alive) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  };

  const stage = createStage(canvas, () => {
    // A texture or the room's light has arrived.
    if (alive && !frame) paint();
  });

  const fit = () => {
    const width = page.clientWidth;
    const height = page.clientHeight;
    if (!width || !height) return;
    const length = stage.fit(width, height);
    if (table) resize(table, length);
    else table = createTable(length);
    paint();
  };

  const ready = () => table !== null && !stroke && away === 0 && !isMoving(table) && cueBall(table).state === ON_TABLE;
  const down = (event: PointerEvent) => {
    if (pull || !ready()) return;
    pull = { id: event.pointerId, x: event.clientX, y: event.clientY, size: 0 };
  };
  const move = (event: PointerEvent) => {
    if (!pull || event.pointerId !== pull.id) return;
    const sx = event.clientX - pull.x;
    const sy = event.clientY - pull.y;
    pull.size = Math.hypot(sx, sy);
    if (pull.size >= MIN_PULL) {
      // Screen axes to table axes; the cue is pulled back, so the ball leaves the other way.
      aim.ux = -(stage.landscape ? sy : sx) / pull.size;
      aim.uy = -(stage.landscape ? sx : -sy) / pull.size;
    }
    paint();
  };
  const up = (event: PointerEvent) => {
    if (!pull || event.pointerId !== pull.id) return;
    const shot = pull;
    pull = null;
    if (shot.size >= MIN_PULL) {
      stroke = { power: power(shot.size), time: 0, struck: false };
      run();
    } else paint();
  };
  const cancel = (event: PointerEvent) => {
    if (!pull || event.pointerId !== pull.id) return;
    pull = null;
    paint();
  };
  const visible = () => {
    if (!document.hidden && table && (isMoving(table) || stroke || away > 0)) run();
  };

  const observer = new ResizeObserver(fit);
  observer.observe(page);
  fit();
  page.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  document.addEventListener("visibilitychange", visible);
  // Sound may only be opened inside a gesture, and which event counts differs by browser: try them all.
  const gestures = ["pointerdown", "touchstart", "mousedown", "touchend", "pointerup", "click", "keydown"] as const;
  for (const gesture of gestures) window.addEventListener(gesture, sound.unlock);

  const dispose = () => {
    alive = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    page.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    document.removeEventListener("visibilitychange", visible);
    for (const gesture of gestures) window.removeEventListener(gesture, sound.unlock);
    stage.dispose();
    sound.close();
  };
  return { dispose, unlock: sound.unlock };
}
