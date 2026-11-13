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


export type AgentGlyph = "goldfish" | "person";

function drawPerson(
  context: CanvasRenderingContext2D,
  cursor: GoldfishAgent,
  cursorScale: number,
  color: string,
) {
  context.save();
  context.translate(cursor.x, cursor.y);
  // The head lies on local -Y; rotate it onto the same heading as the fish nose.
  context.rotate(Math.atan2(cursor.vy, cursor.vx) + Math.PI / 2);
  context.scale(cursorScale, cursorScale);
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 1.25;

  // Head, torso, arms and legs fit inside the existing avoidance clearance.
  context.beginPath();
  context.arc(0, -5.5, 3, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(0, -2.5);
  context.lineTo(0, 3);
  context.moveTo(-4.3, 1.8);
  context.lineTo(0, -0.8);
  context.lineTo(4.3, 1.8);
  context.moveTo(-3, 7.5);
  context.lineTo(0, 3);
  context.lineTo(3, 7.5);
  context.stroke();

  // Yellow dot eyes stay visible inside the unfilled head.
  context.beginPath();
  context.arc(-0.95, -5.7, 0.55, 0, Math.PI * 2);
  context.moveTo(1.5, -5.7);
  context.arc(0.95, -5.7, 0.55, 0, Math.PI * 2);
  context.fill();
  context.restore();
}


/** Local Canvas2D glyph with a persistent trail layer; no 3D lighting, textures or projection. */
export class GoldfishScene {
  private readonly context: CanvasRenderingContext2D;
  private readonly traceContext: CanvasRenderingContext2D;
  private readonly previousPositions = new Map<number, { x: number; y: number }>();
  private width = 1;
  private height = 1;
  private ratio = 1;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly traceCanvas: HTMLCanvasElement,
    private readonly count = 72,
  ) {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas2D is unavailable");
    this.context = context;
    const traceContext = traceCanvas.getContext("2d", { alpha: true });
    if (!traceContext) throw new Error("Canvas2D trail layer is unavailable");
    this.traceContext = traceContext;
  }

  setSize(width: number, height: number) {
    const oldWidth = this.width;
    const oldHeight = this.height;
    const previousTrace = document.createElement("canvas");
    previousTrace.width = this.traceCanvas.width;
    previousTrace.height = this.traceCanvas.height;
    previousTrace.getContext("2d")?.drawImage(this.traceCanvas, 0, 0);

    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.ratio);
    this.canvas.height = Math.round(this.height * this.ratio);
    this.traceCanvas.width = this.canvas.width;
    this.traceCanvas.height = this.canvas.height;
    this.context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    this.traceContext.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);

    if (previousTrace.width && previousTrace.height) {
      this.traceContext.drawImage(previousTrace, 0, 0, this.width, this.height);
    }
    if (oldWidth > 0 && oldHeight > 0) {
      const scaleX = this.width / oldWidth;
      const scaleY = this.height / oldHeight;
      for (const [id, position] of this.previousPositions) {
        this.previousPositions.set(id, { x: position.x * scaleX, y: position.y * scaleY });
      }
    }
  }

  render(agents: readonly GoldfishAgent[], glyph: AgentGlyph = "goldfish") {
    if (this.disposed) return;
    this.context.clearRect(0, 0, this.width, this.height);
    this.traceContext.save();
    this.traceContext.strokeStyle = "rgb(216 182 106 / 30%)";
    this.traceContext.lineCap = "round";
    this.traceContext.lineWidth = 0.7;

    for (let i = 0; i < Math.min(this.count, agents.length); i++) {
      const agent = agents[i]!;
      const previous = this.previousPositions.get(agent.id);
      if (previous) {
        this.traceContext.beginPath();
        this.traceContext.moveTo(previous.x, previous.y);
        this.traceContext.lineTo(agent.x, agent.y);
        this.traceContext.stroke();
      }
      this.previousPositions.set(agent.id, { x: agent.x, y: agent.y });
    }
    this.traceContext.restore();

    const drawGlyph = glyph === "person" ? drawPerson : drawLegacyGoldfish;
    for (let i = 0; i < Math.min(this.count, agents.length); i++) {
      drawGlyph(this.context, agents[i]!, 1.5, "#d8b66a", "#0c1115");
    }
  }

  dispose() {
    this.disposed = true;
    this.previousPositions.clear();
    this.context.clearRect(0, 0, this.width, this.height);
    this.traceContext.clearRect(0, 0, this.width, this.height);
  }
}
