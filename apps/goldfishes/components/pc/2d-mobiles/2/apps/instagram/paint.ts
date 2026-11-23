// Instagram (Pride, NOTES 1017), painted: the bars, the stories row, a feed
// post (organic or Sponsored). Sizes follow the iOS app at 390 pt.

import { avatar, count, cover, fillRect, glyph, paragraphHeight, text, theme, verified, width, wrap } from "../../paint/kit";
import type { Painter } from "../../paint/types";
import { ui } from "../../content/voice";

export type InstagramPost = {
  name: string;
  face: string;
  photo: string;
  caption: string;
  likes: number;
  comments: number;
  minutes: number;
  verified: boolean;
  sponsored: boolean;
  location: string;
  liked: boolean;
  tall: boolean;
  liker: string;
};

const HEADER = 54;
const media = (post: InstagramPost, w: number) => (post.tall ? Math.round(w * 1.25) : w);

const post: Painter<InstagramPost> = {
  needs: (data) => [data.face, data.photo],
  measure(ctx, data, env) {
    return HEADER + media(data, env.w) + (data.sponsored ? 44 : 0) + 46 + 20 + paragraphHeight(ctx, `${data.name} ${data.caption}`, env.w - 28, { size: 14, line: 18, lines: 2 }) + 46;
  },
  paint(ctx, data, env, h) {
    const t = theme(env.mode);
    const words = ui(env.lang);
    fillRect(ctx, 0, 0, env.w, h, t.bg);
    avatar(ctx, env.image(data.face), data.name, 12, 11, 32, data.sponsored ? undefined : "#d62976");
    const nameWidth = text(ctx, data.name, 54, data.location || data.sponsored ? 25 : 32, { size: 14, weight: 600, color: t.fg });
    if (data.verified) verified(ctx, 58 + nameWidth, data.location || data.sponsored ? 13 : 20, 14);
    if (data.sponsored || data.location) text(ctx, data.sponsored ? words.sponsored : data.location, 54, 42, { size: 12, color: t.fg });
    glyph(ctx, "more", env.w - 34, 15, 24, t.fg, { line: 2.6 });
    const mh = media(data, env.w);
    cover(ctx, env.image(data.photo), 0, HEADER, env.w, mh, 0, data.photo);
    let y = HEADER + mh;
    if (data.sponsored) {
      fillRect(ctx, 0, y, env.w, 44, "#0095f6");
      text(ctx, words.shopNow, 14, y + 27, { size: 14, weight: 600, color: "#fff" });
      glyph(ctx, "M9 5l7 7-7 7", env.w - 30, y + 10, 22, "#fff", { line: 2.4 });
      y += 44;
    }
    glyph(ctx, "heart", 12, y + 10, 27, data.liked ? "#ff3040" : t.fg, { fill: data.liked });
    if (!data.liked) glyph(ctx, "heart", 12, y + 10, 27, t.fg);
    text(ctx, count(data.likes, env.lang), 44, y + 29, { size: 14, weight: 600, color: t.fg });
    const after = 52 + width(ctx, count(data.likes, env.lang), { size: 14, weight: 600 });
    glyph(ctx, "comment", after, y + 11, 25, t.fg);
    text(ctx, count(data.comments, env.lang), after + 31, y + 29, { size: 14, weight: 600, color: t.fg });
    const send = after + 40 + width(ctx, count(data.comments, env.lang), { size: 14, weight: 600 });
    glyph(ctx, "send", send, y + 11, 24, t.fg);
    glyph(ctx, "bookmark", env.w - 38, y + 11, 25, t.fg);
    y += 46;
    const liked = env.lang === "en" || env.lang === "es" ? `${words.likedBy} ${data.liker} ${env.lang === "es" ? "y" : "and"} ${count(data.likes, env.lang)} ${words.others}` : `${data.liker}님 ${words.others}`;
    text(ctx, liked, 14, y + 6, { size: 14, weight: 600, color: t.fg });
    y += 20;
    // The name in bold, the caption running on after it.
    const lines = wrap(ctx, `${data.name}  ${data.caption}`, env.w - 28, { size: 14 }, 2);
    lines.forEach((line, index) => {
      if (index === 0 && line.startsWith(data.name)) {
        const nameWidth = text(ctx, data.name, 14, y + 8, { size: 14, weight: 600, color: t.fg });
        text(ctx, line.slice(data.name.length), 14 + nameWidth, y + 8, { size: 14, color: t.fg });
      } else text(ctx, line, 14, y + 8 + index * 18, { size: 14, color: t.fg });
    });
    y += lines.length * 18;
    text(ctx, env.lang === "en" ? `View all ${count(data.comments, env.lang)} comments` : `${words.comment} ${count(data.comments, env.lang)}`, 14, y + 14, { size: 14, color: t.sub });
    text(ctx, data.minutes < 1 ? words.now : `${Math.round(data.minutes)}${words.min}`, 14, y + 34, { size: 12, color: t.sub });
  },
  hotspots: (data, env) => [{ x: 25, y: HEADER + media(data, env.w) + (data.sponsored ? 44 : 0) + 23, kind: "like" }, { x: env.w / 2, y: HEADER + media(data, env.w) / 2, kind: "open" }],
};

type Stories = { faces: string[]; names: string[]; own: string };

const stories: Painter<Stories> = {
  needs: (data) => [...data.faces, data.own],
  measure: () => 112,
  paint(ctx, data, env, h) {
    const t = theme(env.mode);
    fillRect(ctx, 0, 0, env.w, h, t.bg);
    const all = [data.own, ...data.faces];
    all.slice(0, 6).forEach((face, index) => {
      const x = 10 + index * 80;
      const ring = ctx.createLinearGradient(x, 82, x + 70, 12);
      ring.addColorStop(0, "#feda75");
      ring.addColorStop(0.5, "#d62976");
      ring.addColorStop(1, "#4f5bd5");
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = index === 0 ? t.line : ring;
      ctx.beginPath();
      ctx.arc(x + 35, 45, 36, 0, Math.PI * 2);
      ctx.stroke();
      avatar(ctx, env.image(face), data.names[index] ?? "", x + 3, 13, 64);
      const name = index === 0 ? (env.lang === "ko" ? "내 스토리" : env.lang === "ja" ? "ストーリーズ" : env.lang === "es" ? "Tu historia" : "Your story") : (data.names[index - 1] ?? "");
      text(ctx, name.length > 10 ? `${name.slice(0, 9)}…` : name, x + 35, 100, { size: 11.5, color: index === 0 ? t.sub : t.fg, align: "center" });
    });
    fillRect(ctx, 0, h - 0.5, env.w, 0.5, t.line);
  },
};

const top: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const t = theme(env.mode);
    fillRect(ctx, 0, 0, env.w, h, t.bg);
    text(ctx, "Instagram", 16, h - 14, { size: 30, weight: 400, color: t.fg, family: '"Snell Roundhand", "Brush Script MT", cursive' });
    glyph(ctx, "heart", env.w - 82, h - 39, 26, t.fg);
    fillRect(ctx, env.w - 66, h - 42, 8, 8, "#ff3040", 4);
    glyph(ctx, "M12 3.5c-5 0-9 3.6-9 8.2 0 2.5 1.2 4.7 3.1 6.2V21l3-1.7c.9.3 1.9.4 2.9.4 5 0 9-3.6 9-8.2S17 3.5 12 3.5zM7 14l3.5-4 2.5 2.5L17 9l-3.5 4-2.5-2.5z", env.w - 44, h - 39, 26, t.fg);
  },
};

const bottom: Painter<{ face: string }> = {
  needs: (data) => [data.face],
  paint(ctx, data, env, h) {
    const t = theme(env.mode);
    fillRect(ctx, 0, 0, env.w, h, t.bg);
    fillRect(ctx, 0, 0, env.w, 0.5, t.line);
    const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map((k) => env.w * k - 13);
    glyph(ctx, "home", xs[0]!, 12, 26, t.fg, { fill: true });
    glyph(ctx, "search", xs[1]!, 12, 26, t.fg);
    glyph(ctx, "M4 4h16v16H4zM12 8v8M8 12h8", xs[2]!, 12, 26, t.fg);
    glyph(ctx, "reels", xs[3]!, 12, 26, t.fg);
    avatar(ctx, env.image(data.face), "me", xs[4]! - 1, 11, 28);
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, t.fg, 3);
  },
};

export const INSTAGRAM_PAINTERS = {
  "instagram.post": post,
  "instagram.stories": stories,
  "instagram.top": top,
  "instagram.bottom": bottom,
};
