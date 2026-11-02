export type Point = { x: number; y: number };
export type NetworkNode = Point & { id: number; session: number; releasedAt: number | null };
export type ContactEvent = "touchstart" | "touchmove" | "touchend" | "touchcancel";
export type ContactChange = Point & { identifier: number };

// Nodes outlive their touches: a new contact adds a node, moving drags it, lifting leaves it where it is to fade.
// A session runs from the first finger down on an empty screen until the last finger lifts.
export type Network = {
  nodes: NetworkNode[];
  held: Map<number, NetworkNode>;
  nextId: number;
  session: number;
};

export function createNetwork(): Network {
  return { nodes: [], held: new Map(), nextId: 0, session: 0 };
}

export function applyContactChanges(network: Network, type: ContactEvent, changes: readonly ContactChange[], time: number) {
  for (const change of changes) {
    if (type === "touchend" || type === "touchcancel") {
      const released = network.held.get(change.identifier);
      if (released) released.releasedAt = time;
      network.held.delete(change.identifier);
      continue;
    }
    const node = network.held.get(change.identifier);
    if (node) {
      node.x = change.x;
      node.y = change.y;
    } else {
      if (network.held.size === 0) network.session += 1;
      const added = { id: network.nextId++, session: network.session, releasedAt: null, x: change.x, y: change.y };
      network.nodes.push(added);
      network.held.set(change.identifier, added);
    }
  }
  return network;
}

// Nodes of one session form a complete graph; across sessions only nodes within `reach` are joined.
export function isLinked(a: NetworkNode, b: NetworkNode, reach: number) {
  return a.session === b.session || Math.hypot(a.x - b.x, a.y - b.y) <= reach;
}

// A held node is fully alive; a left node fades linearly to nothing over `lifetime` ms.
export function lifeOf(node: NetworkNode, time: number, lifetime: number) {
  return node.releasedAt === null ? 1 : Math.max(0, Math.min(1, 1 - (time - node.releasedAt) / lifetime));
}

export function pruneFaded(network: Network, time: number, lifetime: number) {
  network.nodes = network.nodes.filter((node) => lifeOf(node, time, lifetime) > 0);
  return network;
}
