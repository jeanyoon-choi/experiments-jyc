// Messages (iMessage), painted: the group header, the composer and one
// bubble — blue (or green) on the right for the owner, gray on the left with
// a name and a face for everyone else; a photo, a link preview, a heart.

import { avatar, cover, fillRect, glyph, paragraph, paragraphHeight, rrect, text, width, wrap } from "../../paint/kit";
import type { Ctx, Mode, Painter, PaintEnv } from "../../paint/types";

export type MessageBubble = {
  mine: boolean;
  sender: string;
  face: string;
  text: string;
  kind: "text" | "photo" | "link";
  photo: string;
  link: { title: string; site: string } | null;
  tapback: "" | "mine" | "theirs";
  green: boolean;
};

const colors = (mode: Mode) =>
  mode === "dark"
    ? { bg: "#000000", fg: "#ffffff", sub: "#8d8d93", line: "#38383a", gray: "#262629", blue: "#0a84ff", green: "#30d158", bar: "rgba(22,22,24,0.94)", solid: "#161618", fill: "#2c2c2e" }
    : { bg: "#ffffff", fg: "#000000", sub: "#8a8a8e", line: "#d1d1d6", gray: "#e9e9eb", blue: "#0b84fe", green: "#34c759", bar: "rgba(246,246,246,0.94)", solid: "#f6f6f6", fill: "#e9e9eb" };

const BODY = { size: 17, line: 22 };
const LINK = { size: 15, weight: 600, line: 19, lines: 2 };
const PHOTO = { w: 210, h: 158 };
const LINK_IMAGE = 140;
const LEFT = 46;

const maxWidth = (w: number) => Math.min(264, w * 0.7);

function box(ctx: Ctx, data: MessageBubble, env: PaintEnv) {
  const max = maxWidth(env.w);
  if (data.kind === "photo") return { bw: PHOTO.w, bh: PHOTO.h };
  if (data.kind === "link") return { bw: max, bh: LINK_IMAGE + 14 + paragraphHeight(ctx, data.link?.title ?? "", max - 24, LINK) + 24 };
  const lines = wrap(ctx, data.text, max - 24, BODY, 8);
  const widest = Math.max(...lines.map((line) => width(ctx, line, BODY)));
  return { bw: Math.max(36, Math.ceil(widest) + 24), bh: lines.length * BODY.line + 14 };
}

const head = (data: MessageBubble) => (data.mine ? 0 : 16) + (data.tapback ? 22 : 0) + 2;

function tail(ctx: Ctx, edge: number, bottom: number, right: boolean, color: string) {
  const s = right ? 1 : -1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(edge - 6 * s, bottom - 20);
  ctx.quadraticCurveTo(edge - 2 * s, bottom - 4, edge + 5 * s, bottom);
  ctx.quadraticCurveTo(edge - 4 * s, bottom + 1, edge - 14 * s, bottom - 4);
  ctx.closePath();
  ctx.fill();
}

const bubble: Painter<MessageBubble> = {
  needs: (data) => [data.face, data.photo].filter(Boolean),
  measure: (ctx, data, env) => head(data) + box(ctx, data, env).bh + 3,
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const { bw, bh } = box(ctx, data, env);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    const y = head(data);
    const x = data.mine ? env.w - 12 - bw : LEFT;
    const own = data.green ? c.green : c.blue;
    const fill = data.mine ? own : c.gray;
    if (!data.mine) {
      paragraph(ctx, data.sender, LEFT + 12, 13, env.w * 0.5, { size: 11, color: c.sub, lines: 1 });
      avatar(ctx, env.image(data.face), data.sender, 10, y + bh - 28, 28);
    }
    if (data.kind === "photo") {
      cover(ctx, env.image(data.photo), x, y, bw, bh, 18, data.photo);
    } else if (data.kind === "link" && data.link) {
      tail(ctx, data.mine ? x + bw : x, y + bh, data.mine, c.gray);
      fillRect(ctx, x, y, bw, bh, c.gray, 18);
      ctx.save();
      rrect(ctx, x, y, bw, bh, 18);
      ctx.clip();
      cover(ctx, env.image(data.photo), x, y, bw, LINK_IMAGE, 0, data.photo);
      ctx.restore();
      const used = paragraph(ctx, data.link.title, x + 12, y + LINK_IMAGE + 22, bw - 24, { ...LINK, color: c.fg });
      text(ctx, data.link.site, x + 12, y + LINK_IMAGE + 22 + used, { size: 13, color: c.sub });
    } else {
      tail(ctx, data.mine ? x + bw : x, y + bh, data.mine, fill);
      fillRect(ctx, x, y, bw, bh, fill, 18);
      paragraph(ctx, data.text, x + 12, y + 7 + 16.5, bw - 22, { ...BODY, color: data.mine ? "#ffffff" : c.fg, lines: 8 });
    }
    if (data.tapback) {
      const cx = data.mine ? x + 4 : x + bw - 4;
      const by = y - 2;
      const back = data.tapback === "mine" ? c.blue : c.fill;
      const ring = (r: number, px: number, py: number) => {
        ctx.fillStyle = c.bg;
        ctx.beginPath();
        ctx.arc(px, py, r + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = back;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      };
      const dx = data.mine ? -1 : 1;
      ring(2.5, cx + dx * 11, by + 13);
      ring(5, cx + dx * 4, by + 6);
      ring(15, cx - dx * 6, by - 4);
      glyph(ctx, "heart", cx - dx * 6 - 9, by - 13, 18, data.tapback === "mine" ? "#ffffff" : "#ff2d55", { fill: true });
    }
  },
  hotspots: (data, env, h) => [{ x: data.mine ? env.w - 40 : LEFT + 22, y: h - 22, kind: "like" }],
};

type Chrome = { name: string; faces: string[]; unread: number };

const top: Painter<Chrome> = {
  needs: (data) => data.faces.filter(Boolean),
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bar);
    glyph(ctx, "back", 4, 66, 30, c.blue, { line: 2.6 });
    const unread = data.unread > 99 ? "99+" : String(data.unread);
    const uw = Math.max(26, width(ctx, unread, { size: 15, weight: 500 }) + 16);
    fillRect(ctx, 30, 70, uw, 22, c.blue, 11);
    text(ctx, unread, 30 + uw / 2, 86.5, { size: 15, weight: 500, color: "#ffffff", align: "center" });
    const cx = env.w / 2;
    const spots: [number, number, number][] = [
      [cx - 26, 64, 26],
      [cx + 2, 60, 28],
      [cx - 12, 74, 24],
    ];
    spots.forEach(([ax, ay, size], index) => {
      ctx.fillStyle = c.solid;
      ctx.beginPath();
      ctx.arc(ax + size / 2, ay + size / 2, size / 2 + 1.5, 0, Math.PI * 2);
      ctx.fill();
      avatar(ctx, env.image(data.faces[index] ?? ""), `${data.name}${index}`, ax, ay, size);
    });
    const nw = Math.min(env.w - 140, width(ctx, data.name, { size: 11 }));
    paragraph(ctx, data.name, cx - (nw + 9) / 2, 112, env.w - 140, { size: 11, color: c.fg, lines: 1 });
    glyph(ctx, "M9 5l7 7-7 7", cx + nw / 2 - 2, 104, 9, c.sub, { line: 3 });
    glyph(ctx, "M3 7.5h11.5v9H3zM14.5 10.5l6-3v9l-6-3", env.w - 46, 68, 28, c.blue, { line: 1.8 });
    fillRect(ctx, 0, h - 0.5, env.w, 0.5, c.line);
  },
};

const bottom: Painter<Chrome> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    fillRect(ctx, 10, 11, 34, 34, c.fill, 17);
    glyph(ctx, "plus", 17, 18, 20, c.sub, { line: 2.2 });
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1;
    rrect(ctx, 52.5, 10.5, env.w - 64, 35, 17.5);
    ctx.stroke();
    text(ctx, "iMessage", 66, 34, { size: 17, color: c.sub });
    glyph(ctx, "M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3", env.w - 42, 16, 22, c.sub, { line: 1.8 });
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, c.fg, 3);
  },
};

export const MESSAGES_PAINTERS = {
  "messages.bubble": bubble,
  "messages.top": top,
  "messages.bottom": bottom,
};
