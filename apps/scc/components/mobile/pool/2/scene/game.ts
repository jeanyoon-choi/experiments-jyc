import { advance, createTable, resize, tip, G } from "../model/physics";
import type { Table } from "../model/physics";
import { createDiagram } from "./diagram";
import { createStage } from "./stage";
import { createSound } from "./sound";

/** Real gravity (m/s²): what the sensors report in, before it is scaled to the table's own. */
const EARTH = 9.81;
/** The sensor's jitter is taken out over this long (s); short enough that a shake still arrives as one. */
const SENSOR_LAG = 0.04;
/** With no sensor at all, a finger at the screen's edge tips the table this far. */
const FINGER_TILT = (30 * Math.PI) / 180;
/** A ball that has moved less than this in a step (m) has not moved on the screen: nothing is redrawn. */
const SEEN = 0.00002;
/** The balls' speed (m/s, root mean square) at which the table counts as fully stirred: a hard shake. */
const STIRRED = 0.9;

/** The table as it looks, or the same table as a drawing of who pays whom. */
export type Mode = "table" | "diagram";

type Asked = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * Runs the table on a canvas that fills `page`. Nothing is struck and nothing is asked: the table
 * is the mobile. The accelerometer says what a ball lying on the screen would feel (gravity down
 * whichever way the mobile is tipped, and the mobile's own jolts when it is shaken), and the balls
 * are given exactly that, scaled to the table's gravity. `sheet` is the canvas the drawing is made on
 * and `chrome` what sits at the top of the page, which the drawing's ledger starts under.
 */
export function mount(page: HTMLElement, canvas: HTMLCanvasElement, sheet: HTMLCanvasElement, chrome: HTMLElement) {
  let table: Table | null = null;
  const sound = createSound("/3d/pool/table.mp3");
  let frame = 0;
  let last = 0;
  let alive = true;
  let drawn = false;
  let mode: Mode = "table";
  const diagram = createDiagram(sheet);
  // A strike still fading on the drawing keeps it being redrawn.
  let fading = false;
  // What a ball on the screen feels, in real m/s²: along the screen (x right, y up) and into it.
  // `goal` is the sensor's last word, `felt` the table catching up with it.
  const goal = { x: 0, y: 0, n: EARTH };
  const felt = { x: 0, y: 0, n: EARTH };
  // Gravity's direction in the device's own axes, from the orientation sensor.
  const down = { x: 0, y: 0, z: -1, known: false };
  // The accelerometer reports the same thing with opposite signs on iOS and Android. Which this
  // one is, is read off against the orientation sensor, whose axes are the same everywhere.
  let sign = 0;
  let vote = 0;
  // Once a sensor has spoken, the finger no longer tips anything.
  let sensed = false;
  let finger: number | null = null;

  const paint = (seconds = 0) => {
    if (!table) return;
    // Only the tab that is open is drawn; the other costs nothing.
    if (mode === "table") stage.render(table, true);
    else fading = diagram.render(table, stage, seconds);
    drawn = true;
  };

  const loop = (now: number) => {
    frame = 0;
    if (!alive || !table) return;
    const seconds = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = 1 - Math.exp(-seconds / SENSOR_LAG);
    felt.x += (goal.x - felt.x) * k;
    felt.y += (goal.y - felt.y) * k;
    felt.n += (goal.n - felt.n) * k;
    const scale = G / EARTH;
    // Screen axes to table axes: a wide screen shows the table turned a quarter.
    if (stage.landscape) tip(table, -felt.y * scale, felt.x * scale, felt.n * scale);
    else tip(table, felt.x * scale, felt.y * scale, felt.n * scale);
    const moving = advance(table, seconds);
    sound.frame();
    for (const hit of table.hits) {
      sound.hit(hit.kind, hit.speed);
      if (hit.b >= 0) diagram.strike(hit.a, hit.b);
    }
    table.hits.length = 0;
    // How hard the table is being changed: the balls' speed, taken together.
    let square = 0;
    if (table.stir > SEEN) for (const ball of table.balls) square += ball.vx * ball.vx + ball.vy * ball.vy;
    sound.stir(Math.sqrt(square / table.balls.length) / STIRRED);
    // Balls lying in a heap on a tipped table are worked out every frame and drawn in none. The
    // drawing also shows the plumb line, which moves with the hand alone.
    if (table.stir > SEEN || !drawn || mode === "diagram") paint(seconds);
    if ((moving || (mode === "diagram" && fading)) && !document.hidden) frame = requestAnimationFrame(loop);
  };
  const run = () => {
    if (frame || !alive) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  };
  /** Sets what a ball feels, given in the device's own axes (x toward its right edge, y toward its top). */
  const feel = (dx: number, dy: number, n: number) => {
    // The page may be drawn turned on the device's face.
    const turned = screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0;
    const a = (turned * Math.PI) / 180;
    goal.x = dx * Math.cos(a) - dy * Math.sin(a);
    goal.y = dx * Math.sin(a) + dy * Math.cos(a);
    goal.n = n;
    run();
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
    diagram.fit(width, height, chrome.getBoundingClientRect().bottom - page.getBoundingClientRect().top + 12);
    if (table) resize(table, length);
    else table = createTable(length);
    paint();
  };

  const orientation = (event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null) return;
    const beta = (event.beta * Math.PI) / 180;
    const gamma = (event.gamma * Math.PI) / 180;
    down.x = Math.cos(beta) * Math.sin(gamma);
    down.y = -Math.sin(beta);
    down.z = -Math.cos(beta) * Math.cos(gamma);
    down.known = true;
    // Until the accelerometer can be read, the tilt alone plays: gravity, without the jolts.
    if (sign !== 0) return;
    sensed = true;
    finger = null;
    feel(down.x * EARTH, down.y * EARTH, -down.z * EARTH);
  };
  const motion = (event: DeviceMotionEvent) => {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    if (sign === 0) {
      if (!down.known) return;
      // At rest the reading lies along gravity, one way or the other; a few readings settle which.
      vote += (a.x * down.x + a.y * down.y + a.z * down.z) / EARTH;
      if (Math.abs(vote) < 6) return;
      sign = vote > 0 ? 1 : -1;
    }
    sensed = true;
    finger = null;
    feel(a.x * sign, a.y * sign, -a.z * sign);
  };
  // Both sensors are listened to from the start. Where they must be asked for (iOS, inside a
  // gesture) nothing arrives until the first tap has asked; elsewhere they speak at once.
  window.addEventListener("deviceorientation", orientation);
  window.addEventListener("devicemotion", motion);
  let asked = false;
  const ask = () => {
    if (asked || sensed) return;
    const sensors = [
      typeof DeviceMotionEvent === "undefined" ? null : (DeviceMotionEvent as unknown as Asked),
      typeof DeviceOrientationEvent === "undefined" ? null : (DeviceOrientationEvent as unknown as Asked),
    ];
    for (const sensor of sensors) {
      if (!sensor?.requestPermission) continue;
      asked = true;
      sensor.requestPermission().catch(() => {
        // Not a gesture the browser accepts: the next one may be.
        asked = false;
      });
    }
  };

  // Without a sensor (a desktop, or before iOS has handed one over) a held finger tips the table toward itself.
  const toward = (event: PointerEvent) => {
    const box = page.getBoundingClientRect();
    const half = Math.min(box.width, box.height) / 2;
    let x = (event.clientX - box.left - box.width / 2) / half;
    let y = -(event.clientY - box.top - box.height / 2) / half;
    const size = Math.hypot(x, y);
    if (size > 1) {
      x /= size;
      y /= size;
    }
    const tilt = Math.min(1, size) * FINGER_TILT;
    const pull = size > 0 ? (EARTH * Math.sin(tilt)) / Math.min(1, size) : 0;
    // The finger's place is already in screen axes.
    goal.x = x * pull;
    goal.y = y * pull;
    goal.n = EARTH * Math.cos(tilt);
    run();
  };
  const press = (event: PointerEvent) => {
    if (sensed || finger !== null) return;
    finger = event.pointerId;
    toward(event);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId === finger) toward(event);
  };
  const lift = (event: PointerEvent) => {
    if (event.pointerId !== finger) return;
    finger = null;
    goal.x = 0;
    goal.y = 0;
    goal.n = EARTH;
    run();
  };
  const visible = () => {
    if (!document.hidden) run();
  };

  const observer = new ResizeObserver(fit);
  observer.observe(page);
  fit();
  page.addEventListener("pointerdown", press);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", lift);
  window.addEventListener("pointercancel", lift);
  document.addEventListener("visibilitychange", visible);
  // Sound and the sensors may only be opened inside a gesture, and which event counts differs by browser: try them all.
  const gestures = ["pointerdown", "touchstart", "mousedown", "touchend", "pointerup", "click", "keydown"] as const;
  for (const gesture of gestures) window.addEventListener(gesture, sound.unlock);
  const asking = ["touchend", "click"] as const;
  for (const gesture of asking) window.addEventListener(gesture, ask);

  const dispose = () => {
    alive = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    page.removeEventListener("pointerdown", press);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", lift);
    window.removeEventListener("pointercancel", lift);
    document.removeEventListener("visibilitychange", visible);
    window.removeEventListener("deviceorientation", orientation);
    window.removeEventListener("devicemotion", motion);
    for (const gesture of gestures) window.removeEventListener(gesture, sound.unlock);
    for (const gesture of asking) window.removeEventListener(gesture, ask);
    stage.dispose();
    sound.close();
  };
  /** Opens one tab or the other; the balls go on as they were. */
  const show = (next: Mode) => {
    if (next === mode) return;
    mode = next;
    paint();
    run();
  };
  return { dispose, show };
}
