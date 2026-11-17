// One burst of confetti over the screen when the paper is done, all correct:
// 2D canvas, 140 paper pieces fired up from the bottom corners, falling with
// drag and flutter, gone in under three seconds. The canvas is removed when
// the last piece leaves; nothing keeps running.

const PIECES = 140;
const LIFE_MS = 2800;
const COLORS = ["#2563eb", "#16a34a", "#9333ea", "#db2777", "#0891b2", "#ea580c", "#e8211a", "#f2b705"];

type Piece = { x: number; y: number; vx: number; vy: number; w: number; h: number; angle: number; spin: number; flutter: number; color: string };

export function confetti(layer: HTMLElement) {
  const canvas = document.createElement("canvas");
  const width = layer.clientWidth;
  const height = layer.clientHeight;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  layer.append(canvas);
  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return;
  }
  context.scale(ratio, ratio);

  const pieces: Piece[] = Array.from({ length: PIECES }, (_, i) => {
    const left = i % 2 === 0;
    const speed = 0.9 + Math.random() * 0.9;
    const angle = -Math.PI / 2 + (left ? 1 : -1) * (0.12 + Math.random() * 0.45);
    return {
      x: left ? width * 0.08 : width * 0.92,
      y: height + 10,
      vx: Math.cos(angle) * speed * height * 0.0011,
      vy: Math.sin(angle) * speed * height * 0.0021,
      w: 5 + Math.random() * 5,
      h: 7 + Math.random() * 7,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.02,
      flutter: Math.random() * Math.PI * 2,
      color: COLORS[i % COLORS.length],
    };
  });

  const start = performance.now();
  let last = start;
  const frame = (now: number) => {
    const dt = Math.min(32, now - last);
    last = now;
    context.clearRect(0, 0, width, height);
    let alive = 0;
    for (const p of pieces) {
      p.vy += height * 0.0000035 * dt;
      p.vx *= 0.992;
      p.vy *= 0.992;
      p.flutter += 0.012 * dt;
      p.x += (p.vx + Math.sin(p.flutter) * 0.03) * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.y > height + 20) continue;
      alive++;
      context.save();
      context.translate(p.x, p.y);
      context.rotate(p.angle);
      context.scale(1, Math.cos(p.flutter));
      context.fillStyle = p.color;
      context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      context.restore();
    }
    if (alive && now - start < LIFE_MS) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
