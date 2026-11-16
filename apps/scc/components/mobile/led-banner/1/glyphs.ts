import type { Banner } from "./banners";

// The lettering is the handset's own Korean gothic, as in the store apps.
const FAMILY = '"Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif';
const FAR = 20000;

export type Sheet = { canvas: HTMLCanvasElement; aspect: number };

/**
 * One sheet per banner. Red holds the letters with a thin soft edge (the
 * shader re-cuts it sharp at any size), green a near halo, blue a wide one.
 * `aspect` is the long side over the short side of the screen.
 */
export function drawSheet(banner: Banner, aspect: number, maxTexture: number): Sheet {
  const weight = 800;
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = `${weight} 100px ${FAMILY}`;
  const widths = banner.lines.map((line) => probe.measureText(line).width / 100);
  const widest = Math.max(...widths);

  let width: number;
  let height: number;
  let size: number;
  if (banner.scroll) {
    height = 384;
    size = height * 0.72;
    width = Math.ceil(widest * size + height);
    if (width > maxTexture) {
      const k = maxTexture / width;
      width = maxTexture;
      height = Math.floor(height * k);
      size *= k;
    }
  } else {
    width = Math.min(2048, maxTexture);
    height = Math.round(width / aspect);
    size = Math.min((width * 0.86) / widest, (height * 0.84) / (banner.lines.length * 1.06));
  }

  const ink = document.createElement("canvas");
  ink.width = width;
  ink.height = height;
  const pen = ink.getContext("2d")!;
  pen.font = `${weight} ${size}px ${FAMILY}`;
  pen.textAlign = "center";
  pen.textBaseline = "alphabetic";
  pen.fillStyle = "#fff";
  const step = size * 1.06;
  const m = pen.measureText("한");
  const rise = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  banner.lines.forEach((line, i) => {
    const y = height / 2 + (i - (banner.lines.length - 1) / 2) * step + rise;
    pen.fillText(line, width / 2, y);
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowOffsetX = FAR;
  const layers: [string, number][] = [
    ["#f00", size * 0.02],
    ["#0f0", size * 0.1],
    ["#00f", size * 0.5],
  ];
  for (const [colour, blur] of layers) {
    ctx.shadowColor = colour;
    ctx.shadowBlur = blur;
    ctx.drawImage(ink, -FAR, 0);
  }
  return { canvas, aspect: width / height };
}
