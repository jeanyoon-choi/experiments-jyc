// The engine on a canvas, drawn as the gallery drew it: a bubble is a flat shape in its keyword's colour (the
// shape is its sign), a goldfish a black dot, and a finger drawn across the field is a stroke. None of this is the
// model; simulation/1 replaces it with bubble's body.

import { beginStroke, createWorld, extendStroke, step, STROKE_SPACING, type Parameters, type World } from "./model.ts";

const TAU = Math.PI * 2;

/** A keyword's hue: the golden angle apart, or 30–60° off the keyword it was associated from. */
function hueOf(world: World, keyword: number, hues: Map<number, number>): number {
  const known = hues.get(keyword);
  if (known !== undefined) return known;
  const parent = world.keywords[keyword]!.parent;
  const hue = parent === null ? (keyword * 137.5 + 20) % 360 : (hueOf(world, parent, hues) + (keyword % 2 ? 1 : -1) * (30 + ((keyword * 37) % 30)) + 360) % 360;
  hues.set(keyword, hue);
  return hue;
}

function polygon(context: CanvasRenderingContext2D, x: number, y: number, radius: number, points: number, inner: number, turn: number) {
  const corners = points * (inner ? 2 : 1);
  for (let index = 0; index < corners; index += 1) {
    const angle = turn + (index * TAU) / corners;
    const reach = inner && index % 2 ? radius * inner : radius;
    if (index) context.lineTo(x + reach * Math.cos(angle), y + reach * Math.sin(angle));
    else context.moveTo(x + reach * Math.cos(angle), y + reach * Math.sin(angle));
  }
  context.closePath();
}

/** The gallery's nine shapes. */
function shape(context: CanvasRenderingContext2D, x: number, y: number, radius: number, kind: number) {
  const up = -Math.PI / 2;
  context.beginPath();
  if (kind === 0) context.arc(x, y, radius, 0, TAU);
  else if (kind === 1) polygon(context, x, y, radius, 3, 0, up);
  else if (kind === 2) polygon(context, x, y, radius, 4, 0, Math.PI / 4);
  else if (kind === 3) polygon(context, x, y, radius, 4, 0, up);
  else if (kind === 4) polygon(context, x, y, radius, 5, 0, up);
  else if (kind === 5) polygon(context, x, y, radius, 6, 0, 0);
  else if (kind === 6) polygon(context, x, y, radius, 4, 0.42, up);
  else if (kind === 7) polygon(context, x, y, radius, 5, 0.45, up);
  else {
    const arm = radius * 0.34;
    context.rect(x - radius, y - arm, radius * 2, arm * 2);
    context.rect(x - arm, y - radius, arm * 2, radius * 2);
  }
}

export type View = {
  /** New values for the world that is running. */
  set(parameters: Parameters): void;
  /** A new world from these values. */
  restart(parameters: Parameters): void;
  dispose(): void;
};

const open = (parameters: Parameters) => createWorld(parameters, (Math.random() * 0xffffffff) >>> 0);

/** Runs the model on `canvas` until disposed. */
export function startView(canvas: HTMLCanvasElement, parameters: Parameters): View | null {
  const context = canvas.getContext("2d");
  if (!context) return null;
  let world = open(parameters);
  const hues = new Map<number, number>();
  // The field is the largest square that fits, centred; the model's lengths are fractions of its side.
  let side = 1;
  let left = 0;
  let top = 0;
  let ratio = 1;

  const fit = () => {
    ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    side = Math.min(width, height) * ratio;
    left = (canvas.width - side) / 2;
    top = (canvas.height - side) / 2;
  };
  const observer = new ResizeObserver(fit);
  observer.observe(canvas);
  fit();

  const draw = () => {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (const bubble of world.bubbles) {
      const sign = bubble.sign;
      context.fillStyle = `hsl(${hueOf(world, world.signs[sign]!.keyword, hues)}, 72%, ${40 + (sign % 2) * 6}%)`;
      shape(context, left + bubble.x * side, top + bubble.y * side, Math.max(bubble.shown * side, 0.8 * ratio), sign % 9);
      context.fill();
    }
    context.fillStyle = "#000";
    const dot = 2.2 * ratio;
    for (const fish of world.fish) context.fillRect(left + fish.x * side - dot / 2, top + fish.y * side - dot / 2, dot, dot);
  };

  // A stroke: a new keyword where the finger comes down, another bubble of it each time it has moved far enough.
  let drawing: { keyword: number; x: number; y: number; pointer: number } | null = null;
  const place = (event: PointerEvent): [number, number] => {
    const box = canvas.getBoundingClientRect();
    return [((event.clientX - box.left) * ratio - left) / side, ((event.clientY - box.top) * ratio - top) / side];
  };
  const down = (event: PointerEvent) => {
    canvas.setPointerCapture(event.pointerId);
    const [x, y] = place(event);
    drawing = { keyword: beginStroke(world, x, y), x, y, pointer: event.pointerId };
  };
  const move = (event: PointerEvent) => {
    if (!drawing || event.pointerId !== drawing.pointer) return;
    const [x, y] = place(event);
    if (Math.hypot(x - drawing.x, y - drawing.y) <= STROKE_SPACING) return;
    drawing.x = x;
    drawing.y = y;
    extendStroke(world, drawing.keyword, x, y);
  };
  const up = (event: PointerEvent) => {
    if (drawing && event.pointerId === drawing.pointer) drawing = null;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  let last = performance.now();
  let frame = requestAnimationFrame(function loop(now) {
    // The gallery's step: the frame's time, at most 0.05 s.
    step(world, Math.min(0.05, Math.max(0, (now - last) / 1000)));
    last = now;
    draw();
    frame = requestAnimationFrame(loop);
  });

  return {
    set(next) {
      world.parameters = next;
    },
    restart(next) {
      world = open(next);
      hues.clear();
      drawing = null;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    },
  };
}
