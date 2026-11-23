import type { Camera } from "./render";
import type { Scene } from "./scene";
import { INK } from "./style";
import { minutesNow } from "./travel";

// The 소요시간 tab: on the map itself, each station's ride to the chosen
// station as the map now lies — a small tag over the station, in ink while the
// ride is as printed, red where it has grown and blue where it has shrunk.

/** Interchanges are tagged from this zoom; every station from the second. */
const SHOW_TRANSFERS = 0.3;
const SHOW_ALL = 0.9;
const LONGER = "#e02d2d";
const SHORTER = "#1c64e0";
const FONT = '600 10px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

/** Draws the tags over a frame of the map; `printed` is minutesPrinted from `origin`. */
export function drawRides(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  cam: Camera,
  view: { width: number; height: number; dpr: number },
  origin: number,
  printed: Map<number, number>,
) {
  if (cam.s < SHOW_TRANSFERS) return;
  const p = scene.net.pos;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  for (const m of scene.marks) {
    if (!m.transfer && cam.s < SHOW_ALL) continue;
    const before = printed.get(m.node);
    if (before === undefined) continue;
    const x = p[m.node * 2] * cam.s + cam.tx;
    const y = p[m.node * 2 + 1] * cam.s + cam.ty;
    if (x < -30 || y < -30 || x > view.width + 30 || y > view.height + 30) continue;
    const here = m.node === origin;
    const minutes = here ? 0 : Math.round(minutesNow(scene, origin, m.node, before));
    const change = minutes - Math.round(before);
    const text = `${minutes}분`;
    const w = ctx.measureText(text).width + 8;
    const h = 14;
    const top = y - 9 * Math.max(1, cam.s) - h;
    const colour = here || change === 0 ? INK : change > 0 ? LONGER : SHORTER;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, top, w, h, h / 2);
    ctx.fillStyle = here ? "#000000" : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.stroke();
    ctx.fillStyle = here ? "#ffffff" : colour;
    ctx.fillText(text, x, top + h / 2 + 0.5);
  }
}
