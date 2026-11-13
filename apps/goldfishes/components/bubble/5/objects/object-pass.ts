// The objects drawn on the raft's canvas, after the raft, in its material:
// the fragment shader is the spheres' (render/foam.ts SHADING) — coat,
// metal, clear coat, the photographed room, the key, the ground below the
// horizon, each page's own turn and hue — with the object's own normal in
// place of the sphere's. Each object mirrors its nearest neighbours as the
// spheres do (raft 이웃 반사): without them it showed only the room, a lone
// highlight on an empty coat, and read cheap (user: "너무 싼티남"). The
// neighbours are mirrored as the spheres they are (bubbles, ontologically),
// up to four, found here on the CPU. Not carried over: the spheres' seams.
//
// One instanced draw per kind and level: every bubble shown as that kind — a
// page, or a portion under way — x y radius seed, from the frame's bubbles,
// and its neighbours'.

import { BUBBLE_FLOATS, SHADING, type FoamRenderer } from "../render/foam";
import { OBJECT_KINDS, pageKind, portionKind, type ObjectKind, type ObjectParameters } from "./objects";
import { shapeOf } from "./shapes";

/** Neighbours each object mirrors, nearest first, and the floats per instance (its bubble, then theirs). */
const NEIGHBOURS = 4;
const INSTANCE_FLOATS = BUBBLE_FLOATS * (1 + NEIGHBOURS);

/** At this radius on screen (CSS px) and above, an object is drawn from its detailed mesh; below, from its light one. */
const DETAILED_FROM = 14;

const VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec4 bubble;  // x, y, radius, seed
layout(location = 3) in vec4 near0;   // its neighbours, as bubbles (radius 0: none)
layout(location = 4) in vec4 near1;
layout(location = 5) in vec4 near2;
layout(location = 6) in vec4 near3;
uniform vec2 frame;
uniform float size;
uniform float puff;
out vec3 surface;
out vec3 surfaceNormal;
flat out float seed;
flat out vec4 neighbours[4];
void main() {
  neighbours[0] = near0;
  neighbours[1] = near1;
  neighbours[2] = near2;
  neighbours[3] = near3;
  float r = bubble.z * size;
  surface = vec3(bubble.xy + position.xy * r, position.z * bubble.z * puff);
  // Heights stretched by puff: the normal's height shrinks by as much.
  surfaceNormal = vec3(normal.xy * puff, normal.z * size);
  seed = bubble.w;
  vec2 clip = surface.xy / frame * 2.0 - 1.0;
  // Depth 0.5 − height / 8192, as the composite writes the spheres'.
  gl_Position = vec4(clip.x, -clip.y, -surface.z / 4096.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec3 surface;
in vec3 surfaceNormal;
flat in float seed;
flat in vec4 neighbours[4];
out vec4 pixel;
${SHADING}
void main() {
  setUpWorld();
  // As the composite shades a sphere's point (SPHERE_FRAGMENT).
  vec3 n = normalize(surfaceNormal);
  float facing = clamp(n.z, 0.0, 1.0);
  vec3 dir = normalize(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
  mat3 turn = turnOf(seed);
  float rough = clamp(roughness * (1.0 + 0.6 * variety * (hash(vec3(seed * 61.3, 5.5, 8.8)) - 0.5)), 0.0, 1.0);
  vec3 o = toWorld(vec3(surface.xy - frame * 0.5, surface.z));
  vec3 wn = turn * toWorld(n);
  vec3 reflected = envAt(o, turn * toWorld(dir), rough);
  vec3 reflectedClear = clearcoat > 0.0 ? envAt(o, turn * toWorld(dir), rough * 0.3) : reflected;
  // The reflected ray against the neighbouring spheres, as the composite traces it.
  float nearest = 1e9;
  vec4 hit = vec4(0.0);
  // How squarely the ray meets it: an object's neighbour is mirrored as a sphere its drawn shape does not
  // match, so its reflection fades out towards that sphere's edge instead of ending in a cut.
  float square = 0.0;
  for (int k = 0; k < 4; k += 1) {
    vec4 c = neighbours[k];
    if (c.z <= 0.0) continue;
    vec3 oc = surface - vec3(c.xy, 0.0);
    float b = dot(oc, dir);
    float cc = dot(oc, oc) - c.z * c.z;
    float disc = b * b - cc;
    if (cc <= 0.0 || disc <= 0.0) continue;
    float along = -b - sqrt(disc);
    if (along > 0.5 && along < nearest) {
      nearest = along;
      hit = c;
      square = smoothstep(0.0, 0.6, sqrt(disc) / c.z);
    }
  }
  if (nearest < 1e8) {
    vec3 at = surface + dir * nearest;
    vec3 n2 = normalize(at - vec3(hit.xy, 0.0));
    vec3 o2 = toWorld(vec3(at.xy - frame * 0.5, at.z));
    vec3 seen = envAt(o2, turn * toWorld(reflect(dir, n2)), rough);
    vec3 other = surfaceOf(o2, turn * toWorld(n2), abs(dot(dir, n2)), sqrt(coatOf(hit.w)), seen, seen) * mix(0.55, 1.0, smoothstep(0.0, 0.35 * hit.z, nearest));
    float mirrored = neighbourReflection * (1.0 - smoothstep(0.3, 1.0, rough)) * square;
    reflected = mix(reflected, other, mirrored);
    reflectedClear = mix(reflectedClear, other, neighbourReflection * (1.0 - smoothstep(0.3, 1.0, rough * 0.3)) * square);
  }
  vec3 colour = surfaceOf(o, wn, facing, coatOf(seed), reflected, reflectedClear);
  pixel = vec4(filmic(colour * 1.25 * exposure), 1.0);
}
`;

type KindMesh = { vao: WebGLVertexArrayObject; buffers: WebGLBuffer[]; instances: WebGLBuffer; data: Float32Array; count: number; indexCount: number };

export type ObjectPass = {
  /**
   * Draws the frame's `count` bubbles that are shown as objects: the portions
   * before `pageStart` (each from its page, `pageOf`), then the pages.
   */
  draw(pageStart: number, count: number, pageOf: Int32Array, parameters: ObjectParameters): void;
  dispose(): void;
};

export function createObjectPass(foam: FoamRenderer, maxBubbles: number): ObjectPass {
  const gl = foam.gl;
  const program = foam.program(VERTEX, FRAGMENT);
  const sizeAt = gl.getUniformLocation(program, "size");
  const puffAt = gl.getUniformLocation(program, "puff");
  const meshes: KindMesh[] = [];
  /** Per kind, its detailed mesh and its light one. */
  const levels = {} as Record<ObjectKind, readonly [KindMesh, KindMesh]>;
  const build = (kind: ObjectKind, detailed: boolean) => {
    const shape = shapeOf(kind, detailed);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attribute = (location: number, values: Float32Array) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
      return buffer;
    };
    const positions = attribute(0, shape.positions);
    const normals = attribute(1, shape.normals);
    const data = new Float32Array(maxBubbles * INSTANCE_FLOATS);
    const instances = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instances);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    for (let slot = 0; slot <= NEIGHBOURS; slot += 1) {
      gl.enableVertexAttribArray(2 + slot);
      gl.vertexAttribPointer(2 + slot, 4, gl.FLOAT, false, INSTANCE_FLOATS * 4, slot * BUBBLE_FLOATS * 4);
      gl.vertexAttribDivisor(2 + slot, 1);
    }
    const index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, shape.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const mesh = { vao, buffers: [positions, normals, index], instances, data, count: 0, indexCount: shape.indices.length };
    meshes.push(mesh);
    return mesh;
  };
  for (const kind of OBJECT_KINDS) levels[kind] = [build(kind, true), build(kind, false)];

  // Each bubble's nearest neighbours (sweep and prune along x), reused between frames.
  const order = new Int32Array(maxBubbles);
  const lefts = new Float32Array(maxBubbles);
  const nearIds = new Int32Array(maxBubbles * NEIGHBOURS);
  const nearGaps = new Float32Array(maxBubbles * NEIGHBOURS);
  const keep = (index: number, other: number, gap: number) => {
    const base = index * NEIGHBOURS;
    let slot = -1;
    let widest = -Infinity;
    for (let at = 0; at < NEIGHBOURS; at += 1) {
      if (nearIds[base + at]! < 0) {
        slot = at;
        break;
      }
      if (nearGaps[base + at]! > widest) {
        widest = nearGaps[base + at]!;
        slot = at;
      }
    }
    if (nearIds[base + slot]! >= 0 && gap >= widest) return;
    nearIds[base + slot] = other;
    nearGaps[base + slot] = gap;
  };
  const findNeighbours = (count: number, size: number) => {
    const bubbles = foam.bubbles;
    nearIds.fill(-1, 0, count * NEIGHBOURS);
    for (let index = 0; index < count; index += 1) {
      order[index] = index;
      lefts[index] = bubbles[index * 4]! - bubbles[index * 4 + 2]! * Math.max(1, size) * 1.4;
    }
    const sorted = order.subarray(0, count).sort((a, b) => lefts[a]! - lefts[b]!);
    for (let at = 0; at < count; at += 1) {
      const a = sorted[at]!;
      const ax = bubbles[a * 4]!;
      const ay = bubbles[a * 4 + 1]!;
      const ar = bubbles[a * 4 + 2]! * Math.max(1, size) * 1.4;
      for (let next = at + 1; next < count; next += 1) {
        const b = sorted[next]!;
        if (lefts[b]! > ax + ar) break;
        const br = bubbles[b * 4 + 2]! * Math.max(1, size) * 1.4;
        const dx = bubbles[b * 4]! - ax;
        const dy = bubbles[b * 4 + 1]! - ay;
        const reach = ar + br;
        if (Math.abs(dy) >= reach || dx * dx + dy * dy >= reach * reach) continue;
        const gap = Math.hypot(dx, dy) - bubbles[a * 4 + 2]! - bubbles[b * 4 + 2]!;
        keep(a, b, gap);
        keep(b, a, gap);
      }
    }
  };

  const draw: ObjectPass["draw"] = (pageStart, count, pageOf, parameters) => {
    const bubbles = foam.bubbles;
    for (const mesh of meshes) mesh.count = 0;
    findNeighbours(Math.min(count, maxBubbles), parameters.size);
    for (let index = 0; index < Math.min(count, maxBubbles); index += 1) {
      const from = index * BUBBLE_FLOATS;
      const page = pageOf[index]!;
      const kind = index < pageStart ? portionKind(page, bubbles[from + 3]!, parameters) : pageKind(page, parameters);
      if (!kind) continue;
      const mesh = levels[kind][bubbles[from + 2]! * parameters.size >= DETAILED_FROM ? 0 : 1];
      const to = mesh.count * INSTANCE_FLOATS;
      mesh.data.set(bubbles.subarray(from, from + BUBBLE_FLOATS), to);
      for (let slot = 0; slot < NEIGHBOURS; slot += 1) {
        const other = nearIds[index * NEIGHBOURS + slot]!;
        const at = to + (slot + 1) * BUBBLE_FLOATS;
        if (other < 0) mesh.data.fill(0, at, at + BUBBLE_FLOATS);
        else mesh.data.set(bubbles.subarray(other * BUBBLE_FLOATS, (other + 1) * BUBBLE_FLOATS), at);
      }
      mesh.count += 1;
    }
    const size = foam.size();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, size.pixelWidth, size.pixelHeight);
    // In depth with the spheres just drawn (the portions under way): each passes behind the other where it is lower.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(program);
    foam.shade(program);
    gl.uniform1f(sizeAt, parameters.size);
    gl.uniform1f(puffAt, parameters.puff);
    for (const mesh of meshes) {
      if (mesh.count === 0) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instances);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.data, 0, mesh.count * INSTANCE_FLOATS);
      gl.bindVertexArray(mesh.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_INT, 0, mesh.count);
    }
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
  };

  const dispose = () => {
    for (const mesh of meshes) {
      for (const buffer of [...mesh.buffers, mesh.instances]) gl.deleteBuffer(buffer);
      gl.deleteVertexArray(mesh.vao);
    }
    gl.deleteProgram(program);
  };

  return { draw, dispose };
}
