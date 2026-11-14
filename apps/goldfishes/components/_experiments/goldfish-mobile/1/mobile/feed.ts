// What the mobile shows: a vertical feed of short clips that never stops being swiped on. One 2D canvas, drawn every
// frame and used as the screen's texture (mobile.ts).
//
// The clips are the photographs pc/mobiles/2 uses (public/assets/goldfishes/pc-mobiles-2: licensed stock and
// model-made feed pictures; no real people), each held as a clip is: filling the screen, slowly pushed in. A clip is
// watched for as long as it holds — most for a second or two, some flicked past at once, a few stayed on — and then
// the next slides up under the fin. No captions or names: the feed's chrome is only its buttons, as outlines.

const STOCK = "chat-01 chat-03 chat-04 cloud-01 cloud-02 cloud-03 cloud-04 comment-03 extra-01 extra-02 extra-03 extra-04 extra-05 extra-06 extra-07 extra-11 extra-12 gpu-01 gpu-02 gpu-03 gpu-04 headset-01 headset-02 headset-03 headset-04 heart-01 heart-02 heart-03 heart-04 humanoid-01 humanoid-02 humanoid-03 like-03 like-04 roadster-01 roadster-02 roadster-03 roadster-04 robotDog-01 robotDog-02 robotDog-03 robotDog-04 rocket-01 rocket-02 rocket-03 rocket-04 sparkle-02 spinner-01 spinner-02 spinner-03 spinner-04";
const GENERATED = "ape-a ape-b beach-a chat-a chat-b city-a cloud-a cloud-b comment-a comment-b food-a food-b food-c food-d gpu-a gpu-b gym-a headset-a headset-b heart-a heart-b humanoid-a humanoid-b like-a like-b mall-a money-a roadster-a roadster-b robot-a robot-b robotDog-a robotDog-b rocket-a rocket-b sauna-a sparkle-a sparkle-b spinner-a spinner-b";
const BASE = "/assets/goldfishes/pc-mobiles-2";
export const CLIPS = [...STOCK.split(" ").map((name) => `${BASE}/stock/${name}.jpg`), ...GENERATED.split(" ").map((name) => `${BASE}/generated/${name}.jpg`)];
const AVATARS = Array.from({ length: 16 }, (_, index) => `${BASE}/generated/avatar-${String(index + 1).padStart(2, "0")}.jpg`);

export const SCREEN_W = 468;
export const SCREEN_H = 1014;
const SWIPE = 0.26;

type Clip = { image: HTMLImageElement; avatar: HTMLImageElement; drift: number; liked: boolean; likes: number; born: number; hold: number };

const load = (url: string) => {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image;
};

export type Feed = {
  canvas: HTMLCanvasElement;
  /** Draws the screen at `time` (seconds). Returns the swipe under way, 0 … 1 (0 when a clip is being watched). */
  draw(time: number): number;
  /** The screen's mean colour, for the light it throws (0–1, sRGB). */
  glow(): [number, number, number];
};

/** `resolution` scales the canvas's pixels (1: 468 × 1014); what is drawn is the same. */
export function createFeed(resolution = 1, random: () => number = Math.random): Feed {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(SCREEN_W * resolution);
  canvas.height = Math.round(SCREEN_H * resolution);
  const c = canvas.getContext("2d", { alpha: false })!;
  c.scale(resolution, resolution);
  const probe = document.createElement("canvas");
  probe.width = 4;
  probe.height = 8;
  const p = probe.getContext("2d", { willReadFrequently: true })!;

  let order: number[] = [];
  const next = (time: number): Clip => {
    if (order.length === 0) order = CLIPS.map((_, index) => index).sort(() => random() - 0.5);
    const roll = random();
    return {
      image: load(CLIPS[order.pop()!]!),
      avatar: load(AVATARS[Math.floor(random() * AVATARS.length)]!),
      drift: random() * Math.PI * 2,
      liked: false,
      likes: 0,
      born: time,
      // Attention as it is spent on a feed: mostly a second or two, a tenth flicked past, a tenth stayed on.
      hold: roll < 0.12 ? 0.35 + random() * 0.3 : roll > 0.9 ? 3.5 + random() * 2.5 : 0.9 + random() * 1.6,
    };
  };
  let current = next(0);
  let coming = next(0);
  let swipeAt = -1;
  let glowAt = -1;
  let glow: [number, number, number] = [0.5, 0.5, 0.5];

  const clip = (item: Clip, top: number, time: number) => {
    c.save();
    c.beginPath();
    c.rect(0, top, SCREEN_W, SCREEN_H);
    c.clip();
    c.fillStyle = "#000";
    c.fillRect(0, top, SCREEN_W, SCREEN_H);
    const { image } = item;
    if (image.complete && image.naturalWidth > 0) {
      // Filling the screen, pushed in and drifting, as a held shot is.
      const age = time - item.born;
      const scale = Math.max(SCREEN_W / image.naturalWidth, SCREEN_H / image.naturalHeight) * (1.06 + 0.035 * age);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      const slack = (w - SCREEN_W) / 2;
      c.drawImage(image, (SCREEN_W - w) / 2 + slack * 0.6 * Math.sin(item.drift + age * 0.22), top + (SCREEN_H - h) / 2, w, h);
    }
    // The feed's own shade under its buttons.
    const shade = c.createLinearGradient(0, top + SCREEN_H * 0.55, 0, top + SCREEN_H);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = shade;
    c.fillRect(0, top + SCREEN_H * 0.55, SCREEN_W, SCREEN_H * 0.45);

    // Buttons down the right edge: like, comment, send, and the poster's picture.
    const x = SCREEN_W - 46;
    let y = top + SCREEN_H - 372;
    c.lineWidth = 3.2;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.strokeStyle = "#fff";
    const beat = item.liked ? 1 + 0.35 * Math.max(0, 1 - (time - item.likes) * 5) : 1;
    c.save();
    c.translate(x, y);
    c.scale(beat, beat);
    c.beginPath();
    c.moveTo(0, 13);
    c.bezierCurveTo(-26, -5, -14, -22, 0, -9);
    c.bezierCurveTo(14, -22, 26, -5, 0, 13);
    if (item.liked) {
      c.fillStyle = "#ff3040";
      c.fill();
    } else c.stroke();
    c.restore();
    y += 78;
    c.beginPath();
    c.arc(x, y, 15, Math.PI * 0.75, Math.PI * 2.55);
    c.lineTo(x - 15, y + 17);
    c.closePath();
    c.stroke();
    y += 78;
    c.beginPath();
    c.moveTo(x - 16, y - 12);
    c.lineTo(x + 17, y - 12);
    c.lineTo(x - 2, y + 16);
    c.lineTo(x - 5, y - 1);
    c.closePath();
    c.moveTo(x - 5, y - 1);
    c.lineTo(x + 17, y - 12);
    c.stroke();
    y += 84;
    c.save();
    c.beginPath();
    c.arc(x, y, 19, 0, Math.PI * 2);
    c.clip();
    if (item.avatar.complete && item.avatar.naturalWidth > 0) c.drawImage(item.avatar, x - 19, y - 19, 38, 38);
    else {
      c.fillStyle = "#555";
      c.fillRect(x - 19, y - 19, 38, 38);
    }
    c.restore();
    c.beginPath();
    c.arc(x, y, 19, 0, Math.PI * 2);
    c.lineWidth = 2;
    c.stroke();
    // How far through the clip.
    c.fillStyle = "rgba(255,255,255,0.3)";
    c.fillRect(0, top + SCREEN_H - 5, SCREEN_W, 5);
    c.fillStyle = "#fff";
    c.fillRect(0, top + SCREEN_H - 5, SCREEN_W * Math.min(1, (time - item.born) / Math.max(item.hold, 0.01)), 5);
    c.restore();
  };

  return {
    canvas,
    draw(time) {
      if (swipeAt < 0 && time - current.born >= current.hold) swipeAt = time;
      // A clip stayed on is sometimes liked, half-way through.
      if (!current.liked && current.hold > 2.2 && time - current.born > current.hold * 0.5 && current.likes === 0) {
        current.likes = time;
        current.liked = random() < 0.6;
      }
      let slide = 0;
      if (swipeAt >= 0) {
        const t = (time - swipeAt) / SWIPE;
        if (t >= 1) {
          current = coming;
          current.born = time;
          coming = next(time);
          swipeAt = -1;
        } else slide = 1 - (1 - t) ** 3;
      }
      clip(current, -slide * SCREEN_H, time);
      if (slide > 0) clip(coming, (1 - slide) * SCREEN_H, time);
      if (time - glowAt > 0.08) {
        glowAt = time;
        p.drawImage(canvas, 0, 0, 4, 8);
        const data = p.getImageData(0, 0, 4, 8).data;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]!;
          g += data[i + 1]!;
          b += data[i + 2]!;
        }
        glow = [r / (32 * 255), g / (32 * 255), b / (32 * 255)];
      }
      return swipeAt >= 0 ? Math.min(1, (time - swipeAt) / SWIPE) : 0;
    },
    glow: () => glow,
  };
}
