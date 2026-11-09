// One 2048² canvas holds every sign face, so all signs draw in one call.
// Academy names are invented; only the grammar (stacked vertical names, floor
// chips, 모집/특강 banners, red LED tickers) follows Daechi-dong streets.

export const ATLAS = 2048;
/** Pixel scale of the canvas over the 2048 layout (3072² texture). */
const SCALE = 1.5;

export type SignCell = {
  /** UV rect (x, y, w, h) inside the flipped-Y canvas texture. */
  rect: [number, number, number, number];
  /** Background colour, used for the halo on the wall and in the air. */
  glow: [number, number, number];
};

export type SignAtlas = {
  canvas: HTMLCanvasElement;
  vertical: SignCell[];
  horizontal: SignCell[];
  led: SignCell[];
};

const FONT = '"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic","Nanum Gothic",sans-serif';

type Palette = { bg: string; fg: string; accent: string };

const PALETTES: Palette[] = [
  { bg: "#ffffff", fg: "#13207a", accent: "#e8262d" },
  { bg: "#14237f", fg: "#ffffff", accent: "#ffd400" },
  { bg: "#e5222b", fg: "#ffffff", accent: "#ffe600" },
  { bg: "#1662e6", fg: "#ffffff", accent: "#ffffff" },
  { bg: "#ffd60a", fg: "#111111", accent: "#d4141c" },
  { bg: "#0d8f4f", fg: "#ffffff", accent: "#ffef5a" },
  { bg: "#ff7a00", fg: "#ffffff", accent: "#14237f" },
  { bg: "#6a1fb8", fg: "#ffffff", accent: "#ffd400" },
  { bg: "#111111", fg: "#ffe600", accent: "#ff3b3b" },
  { bg: "#20b5e8", fg: "#ffffff", accent: "#0a2a6b" },
  { bg: "#ffffff", fg: "#d4141c", accent: "#14237f" },
  { bg: "#f2f2f2", fg: "#111111", accent: "#1662e6" },
];

const VERTICAL = [
  "명인수학", "정석학원", "최상위수학", "한결국어", "영어전문", "의대관",
  "논술학원", "과학탐구", "수학클리닉", "일등급국어", "대치영어", "물리화학",
  "입시컨설팅", "스터디카페", "독서실", "탑클래스", "엘리트수학", "바른국어",
  "사고력수학", "내신전문", "생명과학", "초등영어", "수능영어", "프라임학원",
  "해법수학", "약", "에이스학원", "고등수학", "만점국어", "SKY", "의치한", "편의점",
];

const HORIZONTAL: [string, string][] = [
  ["명인 수학학원", "3F"], ["최상위 의대반 모집", ""], ["고3 수능 파이널", "4F"],
  ["내신 1:1 클리닉", "02-556-1204"], ["초등 사고력 수학", "2F"], ["한결 국어학원", "5F"],
  ["SKY 입시컨설팅", "상담예약"], ["정석수학 S관", "6F"], ["대치 영어전문", "2F"],
  ["과학탐구 전문관", "7F"], ["스터디카페 24H", "B1"], ["논술 · 면접 대비", "3F"],
  ["고1 선행반 개강", ""], ["물리 · 화학 집중반", "8F"], ["1등급 영어 리딩", "4F"],
  ["수학의 길", "5F"], ["의·치·한 정규반", ""], ["엘리트 수학 B관", "3F"],
  ["중등 내신 대비", "02-569-3381"], ["에이스 국어", "6F"], ["프라임 과학관", "4F"],
  ["해법 영어", "3F"], ["프리미엄 독서실", "9F"], ["탑클래스 수학", "2F"],
];

const suneungTicker = () => {
  // 2027학년도 수능: 2026-11-19. Only shown while it is still ahead.
  const days = Math.ceil((Date.UTC(2026, 10, 19) - Date.now()) / 86_400_000);
  return days > 0 ? `★ 2027학년도 수능 D-${days} ` : "";
};

const LED: [string, string][] = [
  [`${suneungTicker()}★ 최상위 선행반 마감임박 ★ 의대 정규반 모집 ★ 고1·2 겨울방학 특강 ★ `, "#ff2a1a"],
  ["◆ 겨울방학 특강 접수중 ◆ 고1·2 내신대비 ◆ 1:1 맞춤 클리닉 ◆ 성적향상 보장반 ◆ ", "#ffb000"],
  ["▶ 수능 파이널 모의고사 매주 토요일 ▶ 주말 집중반 ▶ 학부모 설명회 ▶ ", "#2aff4a"],
  ["♥ 스터디카페 24시간 연중무휴 ♥ 1인석 · 노트북석 ♥ 무료 커피 ♥ ", "#ff2a1a"],
];

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const toRect = (x: number, y: number, w: number, h: number): SignCell["rect"] => [
  x / ATLAS,
  1 - (y + h) / ATLAS,
  w / ATLAS,
  h / ATLAS,
];

function fitFont(ctx: CanvasRenderingContext2D, text: string, size: number, maxWidth: number, weight = 900) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 8 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
}

function drawVertical(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, p: Palette, i: number) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(x, y, w, h);
  // Inner frame on some; a coloured cap with the subject on others.
  const capped = i % 3 === 1;
  if (i % 4 === 0) {
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 9, y + 9, w - 18, h - 18);
  }
  let top = y + 22;
  if (capped) {
    ctx.fillStyle = p.accent;
    ctx.fillRect(x + 8, y + 8, w - 16, 74);
    ctx.fillStyle = p.bg;
    fitFont(ctx, "학원", 46, w - 30);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i % 2 ? "입시" : "학원", x + w / 2, y + 46);
    top = y + 96;
  }
  const chars = [...text];
  const room = y + h - 26 - top;
  const size = Math.min(w * 0.74, room / chars.length);
  ctx.fillStyle = p.fg;
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const step = room / chars.length;
  chars.forEach((c, k) => ctx.fillText(c, x + w / 2, top + step * (k + 0.5)));
  if (text === "약") {
    ctx.fillStyle = "#e5222b";
    const cx = x + w / 2;
    const cy = y + h * 0.2;
    ctx.fillRect(cx - 12, cy - 38, 24, 76);
    ctx.fillRect(cx - 38, cy - 12, 76, 24);
  }
}

function drawHorizontal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, [main, sub]: [string, string], p: Palette, i: number) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(x, y, w, h);
  let left = x + 18;
  let right = x + w - 18;
  ctx.textBaseline = "middle";
  if (sub && /F$|^B1$/.test(sub)) {
    // Floor chip on the right.
    ctx.fillStyle = p.accent;
    ctx.fillRect(x + w - 104, y + 14, 90, h - 28);
    ctx.fillStyle = p.bg;
    ctx.textAlign = "center";
    fitFont(ctx, sub, 64, 80);
    ctx.fillText(sub, x + w - 59, y + h / 2 + 2);
    right = x + w - 118;
  } else if (sub) {
    ctx.fillStyle = p.fg;
    ctx.textAlign = "right";
    fitFont(ctx, sub, 26, 200, 700);
    ctx.fillText(sub, right, y + h - 22);
  }
  if (i % 3 === 0) {
    ctx.fillStyle = p.accent;
    ctx.fillRect(x, y, 14, h);
    left += 6;
  }
  ctx.fillStyle = p.fg;
  ctx.textAlign = "center";
  const size = fitFont(ctx, main, 82, right - left);
  ctx.fillText(main, (left + right) / 2, y + h / 2 - (sub && !/F$|^B1$/.test(sub) ? 10 : 0) + size * 0.04);
}

function drawLed(ctx: CanvasRenderingContext2D, y: number, h: number, text: string, color: string) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, y, ATLAS, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, ATLAS, h);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `900 ${h * 0.8}px ${FONT}`;
  // Repeat the message so the strip is seamless when it wraps.
  const width = ctx.measureText(text).width;
  for (let x = 0; x < ATLAS; x += width) ctx.fillText(text, x, y + h / 2 + 2);
  // Dot matrix: knock out a grid so the letters read as LEDs.
  ctx.fillStyle = "#050505";
  for (let gx = 0; gx < ATLAS; gx += 5) ctx.fillRect(gx, y, 1.6, h);
  for (let gy = y; gy < y + h; gy += 5) ctx.fillRect(0, gy, ATLAS, 1.6);
  ctx.restore();
}

export function buildAtlas(): SignAtlas {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS * SCALE;
  canvas.height = ATLAS * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ATLAS, ATLAS);

  const vertical: SignCell[] = [];
  VERTICAL.forEach((text, i) => {
    const x = (i % 16) * 128;
    const y = Math.floor(i / 16) * 512;
    const p = text === "약" ? PALETTES[0] : text === "편의점" ? PALETTES[5] : PALETTES[(i * 7) % PALETTES.length];
    drawVertical(ctx, x, y, 128, 512, text, p, i);
    vertical.push({ rect: toRect(x + 1, y + 1, 126, 510), glow: hexToRgb(p.bg) });
  });

  const horizontal: SignCell[] = [];
  HORIZONTAL.forEach((entry, i) => {
    const x = (i % 4) * 512;
    const y = 1024 + Math.floor(i / 4) * 128;
    const p = PALETTES[(i * 5 + 3) % PALETTES.length];
    drawHorizontal(ctx, x, y, 512, 128, entry, p, i);
    horizontal.push({ rect: toRect(x + 1, y + 1, 510, 126), glow: hexToRgb(p.bg) });
  });

  const led: SignCell[] = [];
  LED.forEach(([text, color], i) => {
    const y = 1792 + i * 64;
    drawLed(ctx, y, 64, text, color);
    led.push({ rect: toRect(0, y + 1, ATLAS, 62), glow: hexToRgb(color) });
  });

  return { canvas, vertical, horizontal, led };
}

// --- Window lettering -------------------------------------------------------
// Cut-vinyl words on classroom glass, one character per pane: 수 학 학 원.

export const WINDOW_WORDS = [
  "수학학원", "영어학원", "국어학원", "수학전문", "의대반", "입시학원", "논술", "과학탐구",
  "내신대비", "수능만점", "최상위반", "선행반", "클리닉", "독서실", "특강모집", "상담환영",
  "물리화학", "영재교육", "SKY", "수학",
];
export const WORD_SLOTS = 6;
const GLYPH_CELL = 128;
const GLYPH_GRID = 8;

export type Glyphs = {
  canvas: HTMLCanvasElement;
  /** WINDOW_WORDS.length × WORD_SLOTS glyph indices (−1 beyond the word). */
  words: Float32Array;
  lengths: Float32Array;
};

export function buildGlyphs(): Glyphs {
  const chars = [...new Set(WINDOW_WORDS.flatMap((w) => [...w]))];
  const canvas = document.createElement("canvas");
  canvas.width = GLYPH_CELL * GLYPH_GRID;
  canvas.height = GLYPH_CELL * GLYPH_GRID;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${GLYPH_CELL * 0.78}px ${FONT}`;
  chars.forEach((c, i) => {
    const x = (i % GLYPH_GRID) * GLYPH_CELL + GLYPH_CELL / 2;
    const y = Math.floor(i / GLYPH_GRID) * GLYPH_CELL + GLYPH_CELL / 2 + 4;
    ctx.fillText(c, x, y);
  });
  const words = new Float32Array(WINDOW_WORDS.length * WORD_SLOTS).fill(-1);
  const lengths = new Float32Array(WINDOW_WORDS.length);
  WINDOW_WORDS.forEach((w, i) => {
    const glyphs = [...w];
    lengths[i] = glyphs.length;
    glyphs.forEach((c, k) => (words[i * WORD_SLOTS + k] = chars.indexOf(c)));
  });
  return { canvas, words, lengths };
}
