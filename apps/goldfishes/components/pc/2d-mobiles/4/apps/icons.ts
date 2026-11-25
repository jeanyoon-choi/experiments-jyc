// Every app's home-screen icon, drawn at any size: on the home screen, in
// banners, in the switcher. The marks are evocations drawn from simple
// shapes, as the platforms' own colours and silhouettes read at a glance.

import { circle, fillRect, glyph, rrect, text } from "../paint/kit";
import type { Ctx } from "../paint/types";
import type { AppId } from "./types";

type Draw = (ctx: Ctx, s: number) => void;

const squircle = (ctx: Ctx, s: number, fill: string | CanvasGradient) => {
  ctx.fillStyle = fill;
  rrect(ctx, 0, 0, s, s, s * 0.225);
  ctx.fill();
};

const linear = (ctx: Ctx, s: number, stops: string[], angle = 1) => {
  const gradient = angle ? ctx.createLinearGradient(0, s, s, 0) : ctx.createLinearGradient(0, 0, 0, s);
  stops.forEach((color, index) => gradient.addColorStop(index / (stops.length - 1), color));
  return gradient;
};

export const APP_ICONS: Record<AppId, Draw> = {
  instagram: (ctx, s) => {
    squircle(ctx, s, linear(ctx, s, ["#feda75", "#fa7e1e", "#d62976", "#962fbf", "#4f5bd5"]));
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = s * 0.075;
    rrect(ctx, s * 0.22, s * 0.22, s * 0.56, s * 0.56, s * 0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.5, s * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    circle(ctx, s * 0.665, s * 0.335, s * 0.035, "#fff");
  },
  reels: (ctx, s) => {
    squircle(ctx, s, linear(ctx, s, ["#ff3d6e", "#c13584", "#6a3df0"]));
    glyph(ctx, "reels", s * 0.2, s * 0.2, s * 0.6, "#fff", { line: 2.2 });
  },
  tiktok: (ctx, s) => {
    squircle(ctx, s, "#000");
    const note = (dx: number, dy: number, color: string) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(s * 0.42, s * 0.64, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(s * 0.5, s * 0.2, s * 0.08, s * 0.45);
      ctx.beginPath();
      ctx.moveTo(s * 0.58, s * 0.2);
      ctx.quadraticCurveTo(s * 0.62, s * 0.34, s * 0.76, s * 0.36);
      ctx.lineTo(s * 0.76, s * 0.44);
      ctx.quadraticCurveTo(s * 0.64, s * 0.42, s * 0.58, s * 0.36);
      ctx.fill();
      ctx.restore();
    };
    note(-s * 0.025, -s * 0.02, "#25f4ee");
    note(s * 0.025, s * 0.02, "#fe2c55");
    note(0, 0, "#fff");
  },
  x: (ctx, s) => {
    squircle(ctx, s, "#000");
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.moveTo(s * 0.27, s * 0.25);
    ctx.lineTo(s * 0.73, s * 0.75);
    ctx.moveTo(s * 0.73, s * 0.25);
    ctx.lineTo(s * 0.27, s * 0.75);
    ctx.stroke();
  },
  facebook: (ctx, s) => {
    squircle(ctx, s, "#0866ff");
    text(ctx, "f", s * 0.55, s * 0.86, { size: s * 0.82, weight: 800, color: "#fff", align: "center" });
  },
  linkedin: (ctx, s) => {
    squircle(ctx, s, "#0a66c2");
    text(ctx, "in", s * 0.5, s * 0.7, { size: s * 0.52, weight: 800, color: "#fff", align: "center" });
  },
  tinder: (ctx, s) => {
    squircle(ctx, s, linear(ctx, s, ["#fd267a", "#ff6036"], 0));
    glyph(ctx, "fire", s * 0.2, s * 0.18, s * 0.6, "#fff", { fill: true });
  },
  yelp: (ctx, s) => {
    squircle(ctx, s, "#d32323");
    glyph(ctx, "star", s * 0.2, s * 0.2, s * 0.6, "#fff", { fill: true });
  },
  netflix: (ctx, s) => {
    squircle(ctx, s, "#000");
    text(ctx, "N", s * 0.5, s * 0.78, { size: s * 0.72, weight: 900, color: "#e50914", align: "center" });
  },
  news: (ctx, s) => {
    squircle(ctx, s, "#fff");
    ctx.fillStyle = "#fa2d48";
    ctx.beginPath();
    ctx.moveTo(s * 0.18, s * 0.82);
    ctx.lineTo(s * 0.18, s * 0.18);
    ctx.lineTo(s * 0.46, s * 0.18);
    ctx.lineTo(s * 0.82, s * 0.6);
    ctx.lineTo(s * 0.82, s * 0.82);
    ctx.lineTo(s * 0.56, s * 0.82);
    ctx.lineTo(s * 0.18, s * 0.38);
    ctx.fill();
    fillRect(ctx, s * 0.62, s * 0.18, s * 0.2, s * 0.24, "#fa2d48", s * 0.03);
  },
  stocks: (ctx, s) => {
    squircle(ctx, s, "#000");
    glyph(ctx, "chart", s * 0.16, s * 0.18, s * 0.68, "#30d158", { line: 2.4 });
  },
  shop: (ctx, s) => {
    squircle(ctx, s, linear(ctx, s, ["#ff7a00", "#ff4d00"], 0));
    glyph(ctx, "bag", s * 0.2, s * 0.18, s * 0.6, "#fff", { line: 2.2 });
  },
  messages: (ctx, s) => {
    squircle(ctx, s, linear(ctx, s, ["#5df27a", "#22c33f"], 0));
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.47, s * 0.3, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.62);
    ctx.lineTo(s * 0.24, s * 0.78);
    ctx.lineTo(s * 0.42, s * 0.68);
    ctx.fill();
  },
};

export const APP_NAMES: Record<AppId, string> = {
  instagram: "Instagram",
  reels: "Reels",
  tiktok: "TikTok",
  x: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tinder: "Tinder",
  yelp: "Yelp",
  netflix: "Netflix",
  news: "News",
  stocks: "Stocks",
  shop: "Deals",
  messages: "Messages",
};

export function drawIcon(ctx: Ctx, app: AppId, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  APP_ICONS[app](ctx, size);
  ctx.restore();
}
