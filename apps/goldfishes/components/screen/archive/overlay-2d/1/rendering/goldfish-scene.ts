export type GoldfishAgent = Readonly<{ id: number; x: number; y: number; vx: number; vy: number }>;

function drawLegacyGoldfish(
  context: CanvasRenderingContext2D,
  cursor: GoldfishAgent,
  cursorScale: number,
  color: string,
  paperColor: string,
) {
  const angle = Math.atan2(cursor.vy, cursor.vx);

  context.save();
  context.translate(cursor.x, cursor.y);
  context.rotate(angle);
  context.scale(cursorScale, cursorScale);
  context.fillStyle = color;

  context.beginPath();
  context.moveTo(6.4, 0);
  context.bezierCurveTo(4.1, -3.9, -1.9, -4.45, -5.45, -1.7);
  context.quadraticCurveTo(-6.25, 0, -5.45, 1.7);
  context.bezierCurveTo(-1.9, 4.45, 4.1, 3.9, 6.4, 0);
  context.fill();

  context.beginPath();
  context.moveTo(-5.15, -1.62);
  context.lineTo(-10.3, -5.15);
  context.lineTo(-8.55, 0);
  context.lineTo(-10.3, 5.15);
  context.lineTo(-5.15, 1.62);
  context.closePath();
  context.fill();

  context.fillStyle = paperColor;
  context.beginPath();
  context.arc(4.05, -1.05, 0.58, 0, Math.PI * 2);
  context.fill();
  context.restore();
}


/** Local Canvas2D glyph from 2d/1; no 3D lighting, textures or projection. */
export class GoldfishScene {
  private readonly context: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private ratio = 1;
  private disposed = false;
  constructor(private readonly canvas: HTMLCanvasElement, private readonly count = 72) {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas2D is unavailable");
    this.context = context;
  }
  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.ratio);
    this.canvas.height = Math.round(this.height * this.ratio);
    this.context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
  }
  render(agents: readonly GoldfishAgent[]) {
    if (this.disposed) return;
    this.context.clearRect(0, 0, this.width, this.height);
    for (let i = 0; i < Math.min(this.count, agents.length); i++) {
      drawLegacyGoldfish(this.context, agents[i]!, 1.5, "#d8b66a", "#0c1115");
    }
  }
  dispose() {
    this.disposed = true;
    this.context.clearRect(0, 0, this.width, this.height);
  }
}
