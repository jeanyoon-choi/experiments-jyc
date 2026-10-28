// The phone's own surfaces, painted: status bar, notification banner, lock
// and home screens, the app switcher's labels, the Dynamic Island's live
// activity, a full-screen ad, a pay sheet, Screen Time's limit, and the
// sprites of use — the goldfish that is this phone's thumb, a heart.
// iOS by default; Android (Galaxy) where the shapes differ.

import { avatar, circle, count, cover, DISPLAY, fillRect, glyph, paragraph, paragraphHeight, rrect, text, UI, width } from "../../paint/kit";
import type { Ctx, Painter, PaintEnv } from "../../paint/types";
import { BANNER, DOCK, dockAt, GLASS, HOME_GRID, homeLayout, iconAt } from "../../phone/geometry";
import { APP_NAMES, drawIcon } from "../icons";
import type { AppId } from "../types";

function wallpaper(ctx: Ctx, hue: number, w: number, h: number, dim = 0) {
  const gradient = ctx.createLinearGradient(0, 0, w * 0.3, h);
  gradient.addColorStop(0, `hsl(${hue} 70% 62%)`);
  gradient.addColorStop(0.55, `hsl(${(hue + 35) % 360} 65% 38%)`);
  gradient.addColorStop(1, `hsl(${(hue + 70) % 360} 70% 14%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  for (const [x, y, r, shift, alpha] of [
    [0.15, 0.25, 0.75, 180, 0.35],
    [0.9, 0.55, 0.6, 300, 0.3],
    [0.4, 0.95, 0.7, 60, 0.25],
  ] as const) {
    const blob = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, w * r);
    blob.addColorStop(0, `hsla(${(hue + shift) % 360} 90% 65% / ${alpha})`);
    blob.addColorStop(1, `hsla(${(hue + shift) % 360} 90% 65% / 0)`);
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, w, h);
  }
  if (dim) fillRect(ctx, 0, 0, w, h, `rgba(0,0,0,${dim})`);
}

type Status = { time: string; tone: "light" | "dark"; battery: number };

const status: Painter<Status> = {
  paint(ctx, { time, tone, battery }, env) {
    const color = tone === "light" ? "#ffffff" : "#000000";
    if (env.os === "android") {
      text(ctx, time, 24, 27, { size: 14, weight: 500, color });
      const right = env.w - 22;
      fillRect(ctx, right - 9, 15, 9, 15, "transparent");
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      rrect(ctx, right - 8, 15, 8, 14, 1.5);
      ctx.stroke();
      fillRect(ctx, right - 6.5, 15 + 12.5 * (1 - battery), 5, 12.5 * battery - 1.5, color, 1);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(right - 30, 29);
      ctx.lineTo(right - 16, 29);
      ctx.lineTo(right - 16, 15);
      ctx.closePath();
      ctx.fill();
      glyph(ctx, "M2 9.5a14 14 0 0 1 20 0M5.5 13a9 9 0 0 1 13 0M9 16.5a4 4 0 0 1 6 0M12 20h.01", right - 56, 11, 20, color, { line: 2.2 });
      return;
    }
    text(ctx, time, 54, 37, { size: 17, weight: 600, color, align: "center" });
    const right = env.w - 26;
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    rrect(ctx, right - 25, 26, 25, 13, 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
    fillRect(ctx, right - 23, 28, 21 * battery, 9, battery < 0.2 ? "#ff3b30" : color, 2.5);
    fillRect(ctx, right + 1, 30, 1.5, 5, color, 1);
    glyph(ctx, "M2 9.2a14.5 14.5 0 0 1 20 0M5.6 12.8a9.3 9.3 0 0 1 12.8 0M9.2 16.4a4.2 4.2 0 0 1 5.6 0", right - 50, 21, 20, color, { line: 2.4 });
    for (let bar = 0; bar < 4; bar += 1) fillRect(ctx, right - 76 + bar * 5, 36 - (bar + 1) * 3, 3, (bar + 1) * 3, color, 1);
  },
};

type Banner = { app: AppId; title: string; body: string; time: string; stack?: number; face?: string };

const bannerHeight = (ctx: Ctx, data: Banner, env: PaintEnv) => {
  const inner = env.w - (env.os === "android" ? 32 : 76);
  return Math.max(env.os === "android" ? 86 : 74, 36 + paragraphHeight(ctx, data.body, inner, { size: 15, line: 19, lines: 2 }) + 18) + (data.stack ? 10 : 0);
};

const banner: Painter<Banner> = {
  needs: (data) => (data.face ? [data.face] : []),
  measure: bannerHeight,
  paint(ctx, data, env, h) {
    const dark = env.mode === "dark";
    const stack = data.stack ? 10 : 0;
    const body = h - stack;
    if (stack) {
      fillRect(ctx, 14, body - 14, env.w - 28, 24, dark ? "#3a3a3c" : "#e2e2e6", 18);
    }
    if (env.os === "android") {
      fillRect(ctx, 0, 0, env.w, body, dark ? "#2b2a30" : "#ffffff", 26);
      drawIcon(ctx, data.app, 16, 14, 20);
      text(ctx, `${APP_NAMES[data.app]} • ${data.time}`, 44, 29, { size: 12.5, color: dark ? "#c4c4c8" : "#5f6368" });
      text(ctx, data.title, 16, 54, { size: 15, weight: 700, color: dark ? "#fff" : "#1f1f1f" });
      paragraph(ctx, data.body, 16, 74, env.w - 32, { size: 15, line: 19, lines: 2, color: dark ? "#d0d0d4" : "#444746" });
      return;
    }
    fillRect(ctx, 0, 0, env.w, body, dark ? "#2c2c2e" : "#f6f6f8", 24);
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
    ctx.lineWidth = 0.6;
    rrect(ctx, 0.3, 0.3, env.w - 0.6, body - 0.6, 24);
    ctx.stroke();
    if (data.face) {
      avatar(ctx, env.image(data.face), data.title, 13, 15, 40);
      drawIcon(ctx, data.app, 35, 37, 20);
    } else drawIcon(ctx, data.app, 13, 16, 40);
    const fg = dark ? "#ffffff" : "#000000";
    const sub = dark ? "#9a9aa0" : "#6c6c70";
    text(ctx, data.time, env.w - 16, 30, { size: 13, color: sub, align: "right" });
    let title = data.title;
    const room = env.w - 76 - 16 - width(ctx, data.time, { size: 13 }) - 8;
    while (title.length > 1 && width(ctx, title, { size: 15, weight: 600 }) > room) title = title.slice(0, -2) + "…";
    text(ctx, title, 64, 31, { size: 15, weight: 600, color: fg });
    paragraph(ctx, data.body, 64, 51, env.w - 80, { size: 15, line: 19, lines: 2, color: fg });
  },
};

type Lock = { time: string; date: string; hue: number };

const lock: Painter<Lock> = {
  paint(ctx, { time, date, hue }, env) {
    wallpaper(ctx, hue, GLASS.w, GLASS.h, 0.08);
    if (env.os === "android") {
      const [hours, minutes] = time.split(":");
      text(ctx, hours ?? "", 36, 230, { size: 120, weight: 300, color: "#fff", family: DISPLAY });
      text(ctx, minutes ?? "", 36, 350, { size: 120, weight: 300, color: "#fff", family: DISPLAY });
      text(ctx, date, 40, 120, { size: 17, weight: 500, color: "rgba(255,255,255,0.9)" });
    } else {
      text(ctx, date, GLASS.w / 2, 112, { size: 19, weight: 600, color: "rgba(255,255,255,0.9)", align: "center" });
      text(ctx, time, GLASS.w / 2, 210, { size: 98, weight: 700, color: "rgba(255,255,255,0.94)", align: "center", family: DISPLAY, spacing: -2 });
    }
    for (const [x, name] of [
      [62, "M9 3h6l1 4H8zM8 7h8v4l-2 3v7h-4v-7l-2-3z"],
      [GLASS.w - 62, "M3.5 7.5h3l1.5-2.5h8l1.5 2.5h3v12h-17zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"],
    ] as const) {
      circle(ctx, x, GLASS.h - 92, 25, "rgba(0,0,0,0.28)");
      glyph(ctx, name, x - 11, GLASS.h - 103, 22, "#fff", { line: 1.8 });
    }
    fillRect(ctx, GLASS.w / 2 - 67, GLASS.h - 13, 134, 5, "rgba(255,255,255,0.9)", 3);
  },
};

type Home = { hue: number; apps: AppId[]; badges: number[] };

const home: Painter<Home> = {
  paint(ctx, { hue, apps, badges }, env) {
    wallpaper(ctx, hue, GLASS.w, GLASS.h, 0.12);
    const { grid, dock } = homeLayout(apps);
    const label = (app: AppId, x: number, y: number) => {
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 3;
      text(ctx, APP_NAMES[app], x + HOME_GRID.icon / 2, y + HOME_GRID.icon + 16, { size: 12, weight: 500, color: "#fff", align: "center" });
      ctx.shadowBlur = 0;
    };
    const badge = (x: number, y: number, n: number) => {
      if (n <= 0) return;
      const label = n > 99 ? "99+" : String(n);
      const w = Math.max(24, width(ctx, label, { size: 14, weight: 500 }) + 14);
      fillRect(ctx, x + HOME_GRID.icon - w / 2 - 2, y - 8, w, 24, "#ff3b30", 12);
      text(ctx, label, x + HOME_GRID.icon - 2, y + 9, { size: 14, weight: 500, color: "#fff", align: "center" });
    };
    grid.forEach((app, index) => {
      const at = iconAt(index);
      drawIcon(ctx, app, at.x, at.y, at.size);
      label(app, at.x, at.y);
      badge(at.x, at.y, badges[index] ?? 0);
    });
    const search = env.lang === "ko" ? "검색" : env.lang === "ja" ? "検索" : env.lang === "es" ? "Buscar" : "Search";
    const sw = width(ctx, search, { size: 13, weight: 600 }) + 40;
    fillRect(ctx, GLASS.w / 2 - sw / 2, DOCK.y - 44, sw, 30, "rgba(255,255,255,0.22)", 15);
    glyph(ctx, "search", GLASS.w / 2 - sw / 2 + 10, DOCK.y - 37, 15, "#fff", { line: 2.4 });
    text(ctx, search, GLASS.w / 2 + 9, DOCK.y - 24, { size: 13, weight: 600, color: "#fff", align: "center" });
    fillRect(ctx, DOCK.inset, DOCK.y, GLASS.w - DOCK.inset * 2, DOCK.h, "rgba(255,255,255,0.24)", 34);
    dock.forEach((app, index) => {
      const at = dockAt(index);
      drawIcon(ctx, app, at.x, at.y, at.size);
      badge(at.x, at.y, badges[grid.length + index] ?? 0);
    });
  },
};

const heart: Painter<{ color: string }> = {
  paint(ctx, { color }) {
    const gradient = ctx.createLinearGradient(0, 4, 0, 44);
    gradient.addColorStop(0, "#ff7aa8");
    gradient.addColorStop(1, color);
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 4;
    glyph(ctx, "heart", 4, 4, 40, gradient as unknown as string, { fill: true });
    ctx.shadowBlur = 0;
  },
};

const pill: Painter<{ label: string; faces: string[] }> = {
  needs: (data) => data.faces,
  measure: () => 40,
  paint(ctx, { label, faces }, env) {
    fillRect(ctx, 0, 0, env.w, 40, "#0095f6", 20);
    glyph(ctx, "M12 19V5M5.5 11.5 12 5l6.5 6.5", 12, 9, 22, "#fff", { line: 2.6 });
    faces.slice(0, 3).forEach((face, index) => avatar(ctx, env.image(face), label, 38 + index * 16, 8, 24, "#0095f6"));
    text(ctx, label, 38 + Math.min(3, faces.length) * 16 + 14, 26, { size: 15, weight: 600, color: "#fff" });
  },
};

type Ad = { photo: string; brand: string; headline: string; cta: string; accent: string; skip: string; ad: string };

const ad: Painter<Ad> = {
  needs: (data) => [data.photo],
  paint(ctx, data, env) {
    fillRect(ctx, 0, 0, GLASS.w, GLASS.h, "#000");
    cover(ctx, env.image(data.photo), 0, 0, GLASS.w, GLASS.h * 0.68, 0, data.photo);
    const fade = ctx.createLinearGradient(0, GLASS.h * 0.45, 0, GLASS.h * 0.7);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "#000");
    ctx.fillStyle = fade;
    ctx.fillRect(0, GLASS.h * 0.45, GLASS.w, GLASS.h * 0.25);
    fillRect(ctx, GLASS.w - 132, 64, 116, 30, "rgba(0,0,0,0.55)", 15);
    text(ctx, data.skip, GLASS.w - 74, 84, { size: 13, weight: 600, color: "#fff", align: "center" });
    fillRect(ctx, 20, 70, 34, 18, "rgba(255,255,255,0.85)", 4);
    text(ctx, data.ad, 37, 83, { size: 11, weight: 700, color: "#000", align: "center" });
    text(ctx, data.brand.toUpperCase(), 24, GLASS.h * 0.68 + 30, { size: 13, weight: 700, color: data.accent, spacing: 2 });
    paragraph(ctx, data.headline, 24, GLASS.h * 0.68 + 68, GLASS.w - 48, { size: 31, weight: 800, line: 35, lines: 3, color: "#fff", family: DISPLAY });
    fillRect(ctx, 24, GLASS.h - 104, GLASS.w - 48, 54, data.accent, 27);
    text(ctx, data.cta, GLASS.w / 2, GLASS.h - 70, { size: 18, weight: 700, color: "#000", align: "center" });
  },
  hotspots: () => [{ x: GLASS.w / 2, y: GLASS.h - 77, kind: "button" }, { x: GLASS.w - 74, y: 79, kind: "button" }],
};

type Sheet = { item: string; price: string; photo: string; title: string; pay: string; total: string };

const sheet: Painter<Sheet> = {
  needs: (data) => [data.photo],
  paint(ctx, data, env, h) {
    const dark = env.mode === "dark";
    const fg = dark ? "#fff" : "#000";
    const sub = dark ? "#98989f" : "#6c6c70";
    fillRect(ctx, 0, 0, env.w, h + 40, dark ? "#1c1c1e" : "#f2f2f7", 38);
    text(ctx, " Pay", 24, 46, { size: 24, weight: 700, color: fg });
    circle(ctx, env.w - 36, 38, 15, dark ? "#3a3a3c" : "#e3e3e8");
    glyph(ctx, "close", env.w - 45, 29, 18, sub, { line: 2.4 });
    fillRect(ctx, 16, 72, env.w - 32, 72, dark ? "#2c2c2e" : "#fff", 14);
    const card = ctx.createLinearGradient(30, 86, 92, 130);
    card.addColorStop(0, "#1d1d1f");
    card.addColorStop(1, "#5e5ce6");
    fillRect(ctx, 30, 88, 64, 40, card as unknown as string, 6);
    text(ctx, "•••• 4417", 108, 104, { size: 16, weight: 600, color: fg });
    text(ctx, data.title, 108, 126, { size: 14, color: sub });
    fillRect(ctx, 16, 156, env.w - 32, 92, dark ? "#2c2c2e" : "#fff", 14);
    cover(ctx, env.image(data.photo), 30, 170, 64, 64, 10, data.photo);
    paragraph(ctx, data.item, 108, 194, env.w - 140, { size: 15, weight: 600, line: 19, lines: 2, color: fg });
    text(ctx, data.total, 30, 284, { size: 15, color: sub });
    text(ctx, data.price, env.w - 30, 284, { size: 22, weight: 700, color: fg, align: "right" });
    ctx.strokeStyle = "#0a84ff";
    ctx.lineWidth = 2.2;
    rrect(ctx, env.w / 2 - 22, 312, 44, 44, 11);
    ctx.stroke();
    glyph(ctx, "M9 10v1.5M15 10v1.5M12 10v4h-1M9.5 16.5a4 4 0 0 0 5 0", env.w / 2 - 12, 322, 24, "#0a84ff", { line: 2 });
    text(ctx, data.pay, env.w / 2, 384, { size: 15, weight: 500, color: fg, align: "center" });
  },
};

type Limit = { app: AppId; title: string; body: string; ignore: string; ok: string };

const limit: Painter<Limit> = {
  paint(ctx, data) {
    const gradient = ctx.createLinearGradient(0, 0, 0, GLASS.h);
    gradient.addColorStop(0, "#2a2a2e");
    gradient.addColorStop(1, "#111113");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GLASS.w, GLASS.h);
    const cx = GLASS.w / 2;
    ctx.strokeStyle = "#8e8e93";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 22, 268);
    ctx.lineTo(cx + 22, 268);
    ctx.moveTo(cx - 22, 336);
    ctx.lineTo(cx + 22, 336);
    ctx.moveTo(cx - 17, 270);
    ctx.bezierCurveTo(cx - 17, 296, cx + 17, 304, cx + 17, 334);
    ctx.moveTo(cx + 17, 270);
    ctx.bezierCurveTo(cx + 17, 296, cx - 17, 304, cx - 17, 334);
    ctx.stroke();
    text(ctx, data.title, cx, 392, { size: 26, weight: 700, color: "#fff", align: "center", family: DISPLAY });
    paragraph(ctx, `${data.body} ${APP_NAMES[data.app]}.`, cx, 426, 300, { size: 16, line: 21, color: "#aeaeb2", align: "center" });
    fillRect(ctx, 32, GLASS.h - 168, GLASS.w - 64, 52, "#0a84ff", 14);
    text(ctx, data.ok, cx, GLASS.h - 136, { size: 17, weight: 600, color: "#fff", align: "center" });
    text(ctx, data.ignore, cx, GLASS.h - 84, { size: 17, weight: 500, color: "#0a84ff", align: "center" });
  },
  hotspots: () => [{ x: GLASS.w / 2, y: GLASS.h - 90, kind: "button" }],
};

type Live = { app: AppId; label: string; value: string; up: boolean };

/** The Dynamic Island grown into a live activity: black, app at the left, the number at the right. */
const live: Painter<Live> = {
  paint(ctx, data, env) {
    fillRect(ctx, 0, 0, env.w, 58, "#000", 29);
    drawIcon(ctx, data.app, 14, 13, 32);
    text(ctx, data.label, 56, 35, { size: 15, weight: 600, color: "#fff" });
    text(ctx, data.value, env.w - 18, 36, { size: 19, weight: 700, color: data.up ? "#30d158" : "#ff453a", align: "right", family: DISPLAY });
  },
};

const switcherLabel: Painter<{ app: AppId }> = {
  paint(ctx, { app }) {
    drawIcon(ctx, app, 0, 0, 28);
    text(ctx, APP_NAMES[app], 36, 19, { size: 15, weight: 600, color: "#fff" });
  },
};

/** A count that rolls: one number on its own small tile. */
const counter: Painter<{ value: number; color: string; size: number; weight: number }> = {
  paint(ctx, { value, color, size, weight }, env) {
    text(ctx, count(value, env.lang), 0, size, { size, weight, color, family: UI });
  },
};

export const SYSTEM_PAINTERS = {
  "system.status": status,
  "system.banner": banner,
  "system.lock": lock,
  "system.home": home,
  "system.heart": heart,
  "system.pill": pill,
  "system.ad": ad,
  "system.sheet": sheet,
  "system.limit": limit,
  "system.live": live,
  "system.switcher": switcherLabel,
  "system.counter": counter,
};

export { BANNER };
