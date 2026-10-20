import type { SelectedCell } from "../model";

type EntropySource = {
  next: () => number;
};

type SourceNode = {
  id: number;
  xRatio: number;
  yRatio: number;
  elevationRatio: number;
  radiusRatio: number;
};

type Edge = readonly [number, number];
type Triangle = readonly [number, number, number];

type ProjectedNode = SourceNode & {
  screenX: number;
  screenY: number;
  screenRadius: number;
  elevation: number;
};

export type NodeEdgeRenderNode = {
  x: number;
  y: number;
  radius: number;
  elevation: number;
};

export type NodeEdgeRenderEdge = {
  first: number;
  second: number;
  radius: number;
};

type NodeEdgeLayout = {
  cells: SelectedCell[];
  edges: Edge[];
  nodes: ProjectedNode[];
};

type Topology = {
  edges: Edge[];
  nodes: SourceNode[];
};

const MINIMUM_NODE_COUNT = 240;
const MAXIMUM_NODE_COUNT = 520;
const TARGET_AREA_PER_NODE = 3_600;
const VIEWPORT_PADDING_RATIO = 0.012;
let topology: Topology | null = null;
let topologyAspectRatio = 1;
let cachedLayout: {
  width: number;
  height: number;
  value: NodeEdgeLayout;
} | null = null;

function createEntropySource(): EntropySource {
  const values = new Uint32Array(1_024);
  let index = values.length;

  return {
    next: () => {
      if (index >= values.length) {
        globalThis.crypto.getRandomValues(values);
        index = 0;
      }
      const value = values[index];
      index += 1;
      return value / 4_294_967_296;
    },
  };
}

function createNodes(
  width: number,
  height: number,
  entropy: EntropySource,
): SourceNode[] {
  const nodeCount = Math.max(
    MINIMUM_NODE_COUNT,
    Math.min(
      MAXIMUM_NODE_COUNT,
      Math.round((width * height) / TARGET_AREA_PER_NODE),
    ),
  );
  const nodes: SourceNode[] = [];
  const aspectRatio = width / Math.max(1, height);
  const phaseA = entropy.next() * Math.PI * 2;
  const phaseB = entropy.next() * Math.PI * 2;
  const phaseC = entropy.next() * Math.PI * 2;
  const averageSpacing = Math.sqrt((width * height) / nodeCount);
  const heightCenters = Array.from({ length: 7 }, () => ({
    x: entropy.next(),
    y: entropy.next(),
    amplitude: (entropy.next() * 2 - 1) * (0.34 + entropy.next() * 0.42),
    spread: 0.035 + entropy.next() * 0.085,
  }));
  const getElevation = (xRatio: number, yRatio: number) => {
    let elevation =
      Math.sin(xRatio * Math.PI * 4.2 + phaseA) * 0.24 +
      Math.cos(yRatio * Math.PI * 3.4 + phaseB) * 0.2 +
      Math.sin((xRatio + yRatio) * Math.PI * 3.1 + phaseC) * 0.13;
    for (const center of heightCenters) {
      const distanceSquared =
        (center.x - xRatio) ** 2 + (center.y - yRatio) ** 2;
      elevation +=
        center.amplitude * Math.exp(-distanceSquared / center.spread);
    }
    return elevation + (entropy.next() * 2 - 1) * 0.075;
  };
  let attempts = 0;

  while (nodes.length < nodeCount && attempts < nodeCount * 900) {
    attempts += 1;
    const xRatio = VIEWPORT_PADDING_RATIO +
      entropy.next() * (1 - VIEWPORT_PADDING_RATIO * 2);
    const yRatio = VIEWPORT_PADDING_RATIO +
      entropy.next() * (1 - VIEWPORT_PADDING_RATIO * 2);
    const normalizedX = xRatio * 2 - 1;
    const normalizedY = yRatio * 2 - 1;
    const angle = Math.atan2(normalizedY, normalizedX);
    const boundary =
      0.99 +
      Math.sin(angle * 3 + phaseA) * 0.035 +
      Math.sin(angle * 7 + phaseB) * 0.022;
    const superellipseDistance =
      Math.abs(normalizedX) ** 3.6 + Math.abs(normalizedY) ** 3.6;
    if (superellipseDistance > boundary ** 3.6) continue;

    const spacingNoise = 0.54 + entropy.next() * 0.82;
    const candidateSpacing = averageSpacing * spacingNoise;
    const isSeparated = nodes.every((node) => {
      const dx = (node.xRatio - xRatio) * width;
      const dy = (node.yRatio - yRatio) * height;
      const existingSpacing = averageSpacing * node.radiusRatio * 0.11;
      const requiredDistance = Math.max(
        averageSpacing * 0.38,
        (candidateSpacing + existingSpacing) * 0.46,
      );
      return dx * dx + dy * dy >= requiredDistance * requiredDistance;
    });
    if (!isSeparated) continue;

    const hub = entropy.next() < 0.032;
    nodes.push({
      id: nodes.length,
      xRatio,
      yRatio,
      elevationRatio: getElevation(xRatio, yRatio),
      radiusRatio: hub ? 1.65 + entropy.next() * 0.8 : 0.58 + entropy.next(),
    });
  }

  // Extremely small or unusually shaped viewports may exhaust rejection
  // sampling. Fill the remainder without separation rather than returning a
  // partially populated or disconnected network.
  while (nodes.length < nodeCount) {
    const xRatio =
      VIEWPORT_PADDING_RATIO +
      entropy.next() * (1 - VIEWPORT_PADDING_RATIO * 2);
    const yRatio =
      VIEWPORT_PADDING_RATIO +
      entropy.next() * (1 - VIEWPORT_PADDING_RATIO * 2);
    nodes.push({
      id: nodes.length,
      xRatio,
      yRatio,
      elevationRatio: getElevation(xRatio, yRatio),
      radiusRatio: 0.58 + entropy.next(),
    });
  }

  const minimumElevation = Math.min(...nodes.map((node) => node.elevationRatio));
  const maximumElevation = Math.max(...nodes.map((node) => node.elevationRatio));
  const elevationCenter = (minimumElevation + maximumElevation) / 2;
  const elevationRadius = Math.max(
    0.001,
    (maximumElevation - minimumElevation) / 2,
  );
  for (const node of nodes) {
    node.elevationRatio = (node.elevationRatio - elevationCenter) / elevationRadius;
  }

  // Store the aspect used by triangulation so distance comparisons operate in
  // screen space rather than stretching on wide displays.
  topologyAspectRatio = aspectRatio;
  return nodes;
}

function circumcircleContains(
  first: SourceNode,
  second: SourceNode,
  third: SourceNode,
  point: SourceNode,
) {
  const firstX = first.xRatio * topologyAspectRatio;
  const secondX = second.xRatio * topologyAspectRatio;
  const thirdX = third.xRatio * topologyAspectRatio;
  const pointX = point.xRatio * topologyAspectRatio;
  const determinant =
    2 *
    (firstX * (second.yRatio - third.yRatio) +
      secondX * (third.yRatio - first.yRatio) +
      thirdX * (first.yRatio - second.yRatio));
  if (Math.abs(determinant) < 0.000000001) return false;

  const firstSquared = firstX * firstX + first.yRatio * first.yRatio;
  const secondSquared = secondX * secondX + second.yRatio * second.yRatio;
  const thirdSquared = thirdX * thirdX + third.yRatio * third.yRatio;
  const centerX =
    (firstSquared * (second.yRatio - third.yRatio) +
      secondSquared * (third.yRatio - first.yRatio) +
      thirdSquared * (first.yRatio - second.yRatio)) /
    determinant;
  const centerY =
    (firstSquared * (thirdX - secondX) +
      secondSquared * (firstX - thirdX) +
      thirdSquared * (secondX - firstX)) /
    determinant;
  const radiusSquared =
    (centerX - firstX) ** 2 + (centerY - first.yRatio) ** 2;
  const pointDistanceSquared =
    (centerX - pointX) ** 2 + (centerY - point.yRatio) ** 2;
  return pointDistanceSquared <= radiusSquared + 0.000000001;
}

function createDelaunayEdges(sourceNodes: readonly SourceNode[]): Edge[] {
  const superNodes: SourceNode[] = [
    {
      id: sourceNodes.length,
      xRatio: -4,
      yRatio: -3,
      elevationRatio: 0,
      radiusRatio: 0,
    },
    {
      id: sourceNodes.length + 1,
      xRatio: 5,
      yRatio: -3,
      elevationRatio: 0,
      radiusRatio: 0,
    },
    {
      id: sourceNodes.length + 2,
      xRatio: 0.5,
      yRatio: 6,
      elevationRatio: 0,
      radiusRatio: 0,
    },
  ];
  const points = [...sourceNodes, ...superNodes];
  let triangles: Triangle[] = [
    [superNodes[0].id, superNodes[1].id, superNodes[2].id],
  ];

  for (const point of sourceNodes) {
    const invalidTriangles = triangles.filter((triangle) =>
      circumcircleContains(
        points[triangle[0]],
        points[triangle[1]],
        points[triangle[2]],
        point,
      ),
    );
    const boundaryCounts = new Map<string, { edge: Edge; count: number }>();
    for (const triangle of invalidTriangles) {
      for (const edge of [
        [triangle[0], triangle[1]],
        [triangle[1], triangle[2]],
        [triangle[2], triangle[0]],
      ] as Edge[]) {
        const ordered: Edge = edge[0] < edge[1] ? edge : [edge[1], edge[0]];
        const key = `${ordered[0]}:${ordered[1]}`;
        const existing = boundaryCounts.get(key);
        boundaryCounts.set(key, {
          edge: ordered,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }

    const invalidSet = new Set(invalidTriangles);
    triangles = triangles.filter((triangle) => !invalidSet.has(triangle));
    for (const { edge, count } of boundaryCounts.values()) {
      if (count === 1) triangles.push([edge[0], edge[1], point.id]);
    }
  }

  const keys = new Set<string>();
  const edges: Edge[] = [];
  for (const triangle of triangles) {
    if (triangle.some((index) => index >= sourceNodes.length)) continue;
    for (const edge of [
      [triangle[0], triangle[1]],
      [triangle[1], triangle[2]],
      [triangle[2], triangle[0]],
    ] as Edge[]) {
      const ordered: Edge = edge[0] < edge[1] ? edge : [edge[1], edge[0]];
      const key = `${ordered[0]}:${ordered[1]}`;
      if (keys.has(key)) continue;
      keys.add(key);
      edges.push(ordered);
    }
  }
  return edges;
}

function getTopology(width: number, height: number) {
  if (topology) return topology;
  const entropy = createEntropySource();
  const nodes = createNodes(width, height, entropy);
  topology = { nodes, edges: createDelaunayEdges(nodes) };
  return topology;
}

function createLayout(width: number, height: number): NodeEdgeLayout {
  if (
    cachedLayout &&
    cachedLayout.width === width &&
    cachedLayout.height === height
  ) {
    return cachedLayout.value;
  }

  const source = getTopology(width, height);
  const minimumDimension = Math.min(width, height);
  const elevationRange = Math.max(130, minimumDimension * 0.29);
  const baseRadius = Math.max(2.2, Math.min(5.2, minimumDimension / 210));
  const nodes = source.nodes.map((node) => ({
    ...node,
    screenX: node.xRatio * width,
    screenY: node.yRatio * height,
    screenRadius: baseRadius * node.radiusRatio,
    elevation: node.elevationRatio * elevationRange,
  }));
  const cells = nodes.map((node, index) => {
    const size = Math.max(9, node.screenRadius * 2.35);
    return {
      column: index,
      row: 0,
      x: node.screenX - size / 2,
      y: node.screenY - size / 2,
      width: size,
      height: size,
      centerX: node.screenX,
      centerY: node.screenY,
      centerZ: node.elevation,
      radius: node.screenRadius,
    };
  });
  const value = { cells, edges: source.edges, nodes };
  cachedLayout = { width, height, value };
  return value;
}

export function getNodeEdgeCells(
  width: number,
  height: number,
  visibleNodeIndices: ReadonlySet<number> | null,
) {
  const cells = createLayout(width, height).cells;
  return visibleNodeIndices === null
    ? cells
    : cells.filter((cell) => visibleNodeIndices.has(cell.column));
}

export function getNodeEdgeNetwork(width: number, height: number): {
  nodes: NodeEdgeRenderNode[];
  edges: NodeEdgeRenderEdge[];
} {
  const layout = createLayout(width, height);
  return {
    nodes: layout.nodes.map((node) => ({
      x: node.screenX,
      y: node.screenY,
      radius: node.screenRadius,
      elevation: node.elevation,
    })),
    edges: layout.edges.map(([first, second]) => ({
      first,
      second,
      radius: Math.max(
        0.42,
        Math.min(layout.nodes[first].screenRadius, layout.nodes[second].screenRadius) *
          0.14,
      ),
    })),
  };
}

export function getNodeEdgeNodeCount() {
  return topology?.nodes.length ?? 0;
}

export function drawNodeEdgeField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  paper: string,
) {
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);
}
