import type { CellRelations } from "../model/attention-school";

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


export type RelationShape = "straight" | "curve";

const STRENGTH_BINS = 8;
const RELATION_KINDS = 5;
const STYLE_COUNT = STRENGTH_BINS * RELATION_KINDS;
const DENSE_DASHES: readonly number[][] = [[], [1.4, 2.2], [1, 1.5], [2.8, 2.2], []];


/** Local Canvas2D glyph with a persistent trail layer; no 3D lighting, textures or projection. */
export class GoldfishScene {
  private readonly context: CanvasRenderingContext2D;
  private readonly traceContext: CanvasRenderingContext2D;
  private readonly previousPositions = new Map<number, { x: number; y: number }>();
  private relationStrength = new Float32Array(0);
  private relationKind = new Uint8Array(0);
  private relationMembers = new Uint32Array(0);
  private readonly styleCounts = new Uint32Array(STYLE_COUNT);
  private readonly styleOffsets = new Uint32Array(STYLE_COUNT + 1);
  private readonly styleCursors = new Uint32Array(STYLE_COUNT);
  private previousRenderTime = 0;
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

  private ensureRelationCapacity(length: number) {
    if (this.relationStrength.length === length) return;
    this.relationStrength = new Float32Array(length);
    this.relationKind = new Uint8Array(length);
    this.relationKind.fill(255);
    this.relationMembers = new Uint32Array(length);
  }

  private drawRelations(
    agents: readonly GoldfishAgent[],
    relations: CellRelations,
    visible: boolean,
    shape: RelationShape,
    seconds: number,
  ) {
    const { cellCount, centers, radii, flags, weights, scoreMax } = relations;
    const pairCount = agents.length * cellCount;
    this.ensureRelationCapacity(pairCount);
    this.styleCounts.fill(0);

    const rise = 1 - Math.exp(-seconds / 0.1);
    const fall = 1 - Math.exp(-seconds / 0.25);
    for (const fish of agents) {
      const row = fish.id * cellCount;
      for (let cell = 0; cell < cellCount; cell++) {
        const pair = row + cell;
        const flag = flags[pair] ?? 0;
        const kind = flag & 8 ? 4 : flag & 4 ? 3 : flag & 2 ? 2 : flag & 1 ? 1 : 0;
        const raw = weights[pair] ?? 0;
        const weight = kind === 1 ? raw / Math.max(1e-12, scoreMax[fish.id]!) : raw;
        const target = visible ? (kind === 0 ? 0.045 : 0.16 + Math.min(1, weight) * 0.84) : 0;
        const current = this.relationStrength[pair] ?? 0;
        const strength = current + (target - current) * (target > current ? rise : fall);
        this.relationStrength[pair] = strength;
        if (kind > 0) this.relationKind[pair] = kind;
        else if (strength <= 0.055) this.relationKind[pair] = 0;
        if (strength < 0.004) continue;
        const bin = Math.min(STRENGTH_BINS - 1, Math.floor(strength * STRENGTH_BINS));
        const style = (this.relationKind[pair] ?? 0) * STRENGTH_BINS + bin;
        this.styleCounts[style]! += 1;
      }
    }

    this.styleOffsets[0] = 0;
    for (let style = 0; style < STYLE_COUNT; style++) {
      this.styleOffsets[style + 1] = this.styleOffsets[style]! + this.styleCounts[style]!;
      this.styleCursors[style] = this.styleOffsets[style]!;
    }
    for (let pair = 0; pair < pairCount; pair++) {
      const strength = this.relationStrength[pair]!;
      if (strength < 0.004) continue;
      const bin = Math.min(STRENGTH_BINS - 1, Math.floor(strength * STRENGTH_BINS));
      const style = this.relationKind[pair]! * STRENGTH_BINS + bin;
      this.relationMembers[this.styleCursors[style]!] = pair;
      this.styleCursors[style]! += 1;
    }

    const context = this.context;
    context.save();
    context.strokeStyle = "#d8b66a";
    context.lineCap = "round";
    for (let style = 0; style < STYLE_COUNT; style++) {
      const start = this.styleOffsets[style]!, end = this.styleOffsets[style + 1]!;
      if (start === end) continue;
      const kind = Math.floor(style / STRENGTH_BINS);
      const strength = ((style % STRENGTH_BINS) + 0.5) / STRENGTH_BINS;
      context.globalAlpha = strength * 0.84;
      context.lineWidth = 0.38 + strength * 1.42;
      context.setLineDash(DENSE_DASHES[kind]!);
      context.beginPath();
      for (let member = start; member < end; member++) {
        const pair = this.relationMembers[member]!;
        const fish = agents[Math.floor(pair / cellCount)];
        if (!fish) continue;
        const cell = pair % cellCount;
        const targetX = centers[cell * 2]!, targetY = centers[cell * 2 + 1]!;
        const dx = targetX - fish.x, dy = targetY - fish.y;
        const distance = Math.hypot(dx, dy);
        const radius = radii[cell]!;
        const scale = radius > 0 && distance > radius ? (distance - radius) / distance : radius > 0 ? 0 : 1;
        const endX = fish.x + dx * scale, endY = fish.y + dy * scale;
        context.moveTo(fish.x, fish.y);
        if (shape === "straight" || distance < 1) {
          context.lineTo(endX, endY);
        } else {
          const bendSeed = ((fish.id * 37 + cell * 61) % 101) / 100 - 0.5;
          const bend = bendSeed * Math.min(90, distance * 0.34);
          const normalX = -dy / distance, normalY = dx / distance;
          context.bezierCurveTo(
            fish.x + dx * scale * 0.33 + normalX * bend,
            fish.y + dy * scale * 0.33 + normalY * bend,
            fish.x + dx * scale * 0.67 + normalX * bend,
            fish.y + dy * scale * 0.67 + normalY * bend,
            endX,
            endY,
          );
        }
      }
      context.stroke();
    }
    context.restore();
  }

  render(
    agents: readonly GoldfishAgent[],
    relations: CellRelations,
    showRelations: boolean,
    relationShape: RelationShape,
  ) {
    if (this.disposed) return;
    const now = performance.now();
    const seconds = this.previousRenderTime ? Math.min(0.1, (now - this.previousRenderTime) / 1000) : 1 / 24;
    this.previousRenderTime = now;
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

    this.drawRelations(agents, relations, showRelations, relationShape, seconds);
    for (let i = 0; i < Math.min(this.count, agents.length); i++) {
      drawLegacyGoldfish(this.context, agents[i]!, 1.5, "#d8b66a", "#0c1115");
    }
  }

  dispose() {
    this.disposed = true;
    this.previousRenderTime = 0;
    this.previousPositions.clear();
    this.context.clearRect(0, 0, this.width, this.height);
    this.traceContext.clearRect(0, 0, this.width, this.height);
  }
}
