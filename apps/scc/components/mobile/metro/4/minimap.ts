import { lineById, size } from "./model";
import type { Camera } from "./render";
import type { Scene } from "./scene";
import { INK } from "./style";

// The whole map in a corner: every line where it now lies — in its full
// colour inside the part of the paper the screen is showing, pale outside it —
// and that part as a frame.

/** Cord nodes drawn per line: every nth, and each run's ends. */
const EVERY = 4;
/** Opacity of the lines outside the part on screen. */
const PALE = 0.28;

/** Draws the overview into a square canvas of `px` CSS px at device pixel ratio `dpr`. */
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  cam: Camera,
  view: { width: number; height: number },
  px: number,
  dpr: number,
) {
  const k = (px * dpr) / Math.max(size[0], size[1]);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, px * dpr, px * dpr);
  ctx.setTransform(k, 0, 0, k, (px * dpr - size[0] * k) / 2, (px * dpr - size[1] * k) / 2);
  // The screen's part of the paper, kept inside the map.
  const x0 = Math.max(0, -cam.tx / cam.s);
  const y0 = Math.max(0, -cam.ty / cam.s);
  const x1 = Math.min(size[0], (view.width - cam.tx) / cam.s);
  const y1 = Math.min(size[1], (view.height - cam.ty) / cam.s);

  const p = scene.net.pos;
  const paths: [colour: string, path: Path2D][] = [];
  for (const [id, runs] of scene.byLine) {
    const path = new Path2D();
    for (const r of runs) {
      const ids = r.ids;
      const last = ids.length - 1;
      path.moveTo(p[ids[0] * 2], p[ids[0] * 2 + 1]);
      for (let j = EVERY; j < last; j += EVERY) path.lineTo(p[ids[j] * 2], p[ids[j] * 2 + 1]);
      path.lineTo(p[ids[last] * 2], p[ids[last] * 2 + 1]);
    }
    paths.push([lineById.get(id)!.colour, path]);
  }
  const strokeAll = () => {
    for (const [colour, path] of paths) {
      ctx.strokeStyle = colour;
      ctx.stroke(path);
    }
  };
  ctx.lineJoin = "round";
  ctx.lineWidth = (1.1 * dpr) / k;
  ctx.globalAlpha = PALE;
  strokeAll();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  strokeAll();
  ctx.restore();

  ctx.lineWidth = (1.5 * dpr) / k;
  ctx.strokeStyle = INK;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
}
