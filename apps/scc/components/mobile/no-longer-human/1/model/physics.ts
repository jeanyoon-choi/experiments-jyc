// A page's letters as a 2D physical system. Letters stay pinned in their
// typeset place until a finger or a struck letter knocks them loose; loose
// letters float with little damping, collide with each other and with the
// four edges of the page, spin from glancing blows, swell on impact and throw
// off a few specks of ink.
//
// Cost is kept proportional to the loose letters: pinned letters sit in a grid
// built once, loose letters in a typed-array grid rebuilt each substep, and
// nothing is allocated per frame.

export type Glyph = {
  char: string;
  font: string;
  /** Typeset box, page-local; papered over once the letter comes loose. */
  left: number;
  top: number;
  width: number;
  height: number;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  pulse: number;
  free: boolean;
  /** Atlas cell, set by the renderer; -1 until placed. */
  sx: number;
  sy: number;
};

export type Scene = {
  width: number;
  height: number;
  glyphs: Glyph[];
  loose: Glyph[];
  specks: Float32Array;
  speckCount: number;
  awake: boolean;
  /** Letters still carry a push or specks are flying: frames follow the display. */
  lively: boolean;
  columns: number;
  rows: number;
  pinnedHead: Int32Array;
  pinnedNext: Int32Array;
  looseHead: Int32Array;
  looseNext: Int32Array;
};

const RESTITUTION = 0.82;
const WALL_RESTITUTION = 0.72;
const DAMPING = 0.994;
const SPIN_DAMPING = 0.985;
// A pinned letter is knocked loose by an approach faster than this (px/frame).
const KNOCK = 0.55;
const MAX_SPEED = 26;
const MAX_SPECKS = 160;
const SPECK = 5; // x, y, vx, vy, life
const FINGER_RADIUS = 38;
const CELL = 24;

/** Reads every visible letter of one page from the typeset DOM, in page-local pixels. */
export function collectGlyphs(root: HTMLElement, pageLeft: number, pageTop: number, width: number, height: number): Scene {
  const glyphs: Glyph[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const right = pageLeft + width;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    let onPage = false;
    for (let index = 0; index < rects.length && !onPage; index += 1) {
      onPage = rects[index].right > pageLeft + 1 && rects[index].left < right - 1;
    }
    if (!onPage || !node.parentElement) continue;
    const style = getComputedStyle(node.parentElement);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const text = node.data;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === " " || char === "\n" || char === "\t") continue;
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.left < pageLeft - 1 || rect.left >= right - 1) continue;
      const left = rect.left - pageLeft;
      const top = rect.top - pageTop;
      glyphs.push({
        char,
        font,
        left,
        top,
        width: rect.width,
        height: rect.height,
        r: Math.max(3, rect.width * 0.46),
        x: left + rect.width / 2,
        y: top + rect.height / 2,
        vx: 0,
        vy: 0,
        angle: 0,
        spin: 0,
        pulse: 0,
        free: false,
        sx: -1,
        sy: -1,
      });
    }
  }
  range.detach();

  const columns = Math.ceil(width / CELL) + 1;
  const rows = Math.ceil(height / CELL) + 1;
  const pinnedHead = new Int32Array(columns * rows).fill(-1);
  const pinnedNext = new Int32Array(glyphs.length).fill(-1);
  glyphs.forEach((glyph, index) => {
    const cell = cellOf(glyph.x, glyph.y, columns, rows);
    pinnedNext[index] = pinnedHead[cell];
    pinnedHead[cell] = index;
  });

  return {
    width,
    height,
    glyphs,
    loose: [],
    specks: new Float32Array(MAX_SPECKS * SPECK),
    speckCount: 0,
    awake: false,
    lively: false,
    columns,
    rows,
    pinnedHead,
    pinnedNext,
    looseHead: new Int32Array(columns * rows),
    looseNext: new Int32Array(glyphs.length),
  };
}

const cellOf = (x: number, y: number, columns: number, rows: number) => {
  const cx = Math.min(Math.max(Math.floor(x / CELL), 0), columns - 1);
  const cy = Math.min(Math.max(Math.floor(y / CELL), 0), rows - 1);
  return cy * columns + cx;
};

const release = (scene: Scene, glyph: Glyph) => {
  if (glyph.free) return;
  glyph.free = true;
  scene.loose.push(glyph);
};

/** A finger moving from (x0, y0) to (x1, y1) skates the letters near its path. */
export function skate(scene: Scene, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length2 = dx * dx + dy * dy || 1;
  const minX = Math.min(x0, x1) - FINGER_RADIUS;
  const maxX = Math.max(x0, x1) + FINGER_RADIUS;
  const minY = Math.min(y0, y1) - FINGER_RADIUS;
  const maxY = Math.max(y0, y1) + FINGER_RADIUS;
  for (const glyph of scene.glyphs) {
    if (glyph.x < minX || glyph.x > maxX || glyph.y < minY || glyph.y > maxY) continue;
    const t = Math.min(Math.max(((glyph.x - x0) * dx + (glyph.y - y0) * dy) / length2, 0), 1);
    const nx = glyph.x - (x0 + dx * t);
    const ny = glyph.y - (y0 + dy * t);
    const distance = Math.sqrt(nx * nx + ny * ny);
    if (distance > FINGER_RADIUS) continue;
    const falloff = (1 - distance / FINGER_RADIUS) ** 2;
    const inverse = 1 / (distance || 1);
    release(scene, glyph);
    glyph.vx += (dx - glyph.vx) * 0.65 * falloff + nx * inverse * 0.9 * falloff;
    glyph.vy += (dy - glyph.vy) * 0.65 * falloff + ny * inverse * 0.9 * falloff;
    glyph.spin += (dx * ny - dy * nx) * 0.0009 * falloff;
  }
  scene.awake = true;
  scene.lively = true;
}

const emit = (scene: Scene, x: number, y: number, impact: number, nx: number, ny: number) => {
  const count = Math.min(3, Math.floor(impact / 1.8));
  const base = Math.atan2(ny, nx);
  for (let index = 0; index < count && scene.speckCount < MAX_SPECKS; index += 1) {
    const angle = base + (Math.random() - 0.5) * 2.4;
    const speed = impact * (0.3 + Math.random() * 0.5);
    const offset = scene.speckCount * SPECK;
    scene.specks[offset] = x;
    scene.specks[offset + 1] = y;
    scene.specks[offset + 2] = Math.cos(angle) * speed;
    scene.specks[offset + 3] = Math.sin(angle) * speed;
    scene.specks[offset + 4] = 1;
    scene.speckCount += 1;
  }
};

const strike = (glyph: Glyph, impact: number) => {
  if (impact > 1) glyph.pulse = Math.max(glyph.pulse, Math.min(1, impact / 7));
};

/** A loose letter against another loose letter: equal masses. */
function bounce(scene: Scene, a: Glyph, b: Glyph) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = a.r + b.r;
  const distance2 = dx * dx + dy * dy;
  if (distance2 >= reach * reach) return;
  const distance = Math.sqrt(distance2) || 0.01;
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = (reach - distance) * 0.5;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;
  const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (approach >= 0) return;
  const impulse = (-(1 + RESTITUTION) * approach) / 2;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
  const tangent = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
  a.spin += tangent * 0.012;
  b.spin -= tangent * 0.012;
  strike(a, -approach);
  strike(b, -approach);
  emit(scene, a.x + nx * a.r, a.y + ny * a.r, -approach, -ny, nx);
}

/** A loose letter against a pinned one: a blow frees it, a slow touch meets a wall. */
function knock(scene: Scene, moving: Glyph, pinned: Glyph) {
  const dx = pinned.x - moving.x;
  const dy = pinned.y - moving.y;
  const reach = moving.r + pinned.r;
  const distance2 = dx * dx + dy * dy;
  if (distance2 >= reach * reach) return;
  const distance = Math.sqrt(distance2) || 0.01;
  const nx = dx / distance;
  const ny = dy / distance;
  const approach = moving.vx * nx + moving.vy * ny;
  if (approach > KNOCK) {
    release(scene, pinned);
    bounce(scene, moving, pinned);
    return;
  }
  const overlap = reach - distance;
  moving.x -= nx * overlap;
  moving.y -= ny * overlap;
  if (approach > 0) {
    moving.vx -= (1 + RESTITUTION) * approach * nx;
    moving.vy -= (1 + RESTITUTION) * approach * ny;
    moving.spin += (moving.vx * -ny + moving.vy * nx) * 0.01;
    strike(moving, approach);
  }
}

function collide(scene: Scene) {
  const { glyphs, loose, columns, rows, pinnedHead, pinnedNext, looseHead, looseNext } = scene;
  const count = loose.length;
  looseHead.fill(-1);
  for (let index = 0; index < count; index += 1) {
    const cell = cellOf(loose[index].x, loose[index].y, columns, rows);
    looseNext[index] = looseHead[cell];
    looseHead[cell] = index;
  }

  for (let index = 0; index < count; index += 1) {
    const a = loose[index];
    const cx = Math.min(Math.max(Math.floor(a.x / CELL), 0), columns - 1);
    const cy = Math.min(Math.max(Math.floor(a.y / CELL), 0), rows - 1);
    for (let y = Math.max(cy - 1, 0); y <= Math.min(cy + 1, rows - 1); y += 1) {
      for (let x = Math.max(cx - 1, 0); x <= Math.min(cx + 1, columns - 1); x += 1) {
        const cell = y * columns + x;
        for (let j = looseHead[cell]; j !== -1; j = looseNext[j]) {
          if (j > index) bounce(scene, a, loose[j]);
        }
        for (let j = pinnedHead[cell]; j !== -1; j = pinnedNext[j]) {
          if (!glyphs[j].free) knock(scene, a, glyphs[j]);
        }
      }
    }
  }
}

function wall(scene: Scene, glyph: Glyph) {
  let impact = 0;
  let nx = 0;
  let ny = 0;
  if (glyph.x < glyph.r) {
    glyph.x = glyph.r;
    if (glyph.vx < 0) {
      impact = -glyph.vx;
      nx = 1;
      glyph.spin += glyph.vy * 0.02;
      glyph.vx *= -WALL_RESTITUTION;
    }
  } else if (glyph.x > scene.width - glyph.r) {
    glyph.x = scene.width - glyph.r;
    if (glyph.vx > 0) {
      impact = glyph.vx;
      nx = -1;
      glyph.spin -= glyph.vy * 0.02;
      glyph.vx *= -WALL_RESTITUTION;
    }
  }
  if (glyph.y < glyph.r) {
    glyph.y = glyph.r;
    if (glyph.vy < 0) {
      impact = Math.max(impact, -glyph.vy);
      ny = 1;
      glyph.spin -= glyph.vx * 0.02;
      glyph.vy *= -WALL_RESTITUTION;
    }
  } else if (glyph.y > scene.height - glyph.r) {
    glyph.y = scene.height - glyph.r;
    if (glyph.vy > 0) {
      impact = Math.max(impact, glyph.vy);
      ny = -1;
      glyph.spin += glyph.vx * 0.02;
      glyph.vy *= -WALL_RESTITUTION;
    }
  }
  if (impact > 0) {
    strike(glyph, impact);
    emit(scene, glyph.x - nx * glyph.r, glyph.y - ny * glyph.r, impact, nx, ny);
  }
}

/** Advances one 60 Hz frame in two substeps. `drift` keeps loose letters floating. */
export function step(scene: Scene, drift: boolean) {
  const { loose } = scene;
  let energy = 0;
  let fastest = 0;
  for (let index = 0; index < loose.length; index += 1) {
    const glyph = loose[index];
    if (drift) {
      glyph.vx += (Math.random() - 0.5) * 0.04;
      glyph.vy += (Math.random() - 0.5) * 0.04;
    }
    glyph.vx *= DAMPING;
    glyph.vy *= DAMPING;
    glyph.spin *= SPIN_DAMPING;
    glyph.pulse = glyph.pulse > 0.01 ? glyph.pulse * 0.86 : 0;
    const speed2 = glyph.vx * glyph.vx + glyph.vy * glyph.vy;
    if (speed2 > MAX_SPEED * MAX_SPEED) {
      const scale = MAX_SPEED / Math.sqrt(speed2);
      glyph.vx *= scale;
      glyph.vy *= scale;
    }
    energy += speed2 + glyph.spin * glyph.spin * 100;
    if (speed2 > fastest) fastest = speed2;
  }
  for (let substep = 0; substep < 2; substep += 1) {
    for (let index = 0; index < loose.length; index += 1) {
      const glyph = loose[index];
      glyph.x += glyph.vx * 0.5;
      glyph.y += glyph.vy * 0.5;
      glyph.angle += glyph.spin * 0.5;
      wall(scene, glyph);
    }
    collide(scene);
  }

  const { specks } = scene;
  let kept = 0;
  for (let index = 0; index < scene.speckCount; index += 1) {
    const from = index * SPECK;
    const life = specks[from + 4] - 0.045;
    if (life <= 0) continue;
    const to = kept * SPECK;
    specks[to] = specks[from] + specks[from + 2];
    specks[to + 1] = specks[from + 1] + specks[from + 3];
    specks[to + 2] = specks[from + 2] * 0.9;
    specks[to + 3] = specks[from + 3] * 0.9;
    specks[to + 4] = life;
    kept += 1;
  }
  scene.speckCount = kept;
  scene.awake = (drift && loose.length > 0) || energy > 0.25 || kept > 0;
  scene.lively = fastest > 1 || kept > 0;
}

export const SPECK_STRIDE = SPECK;
