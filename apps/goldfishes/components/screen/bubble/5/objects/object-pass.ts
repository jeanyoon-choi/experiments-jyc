// The objects drawn on the raft's canvas, after the raft, in its material:
// the fragment shader is the spheres' (render/foam.ts SHADING) — coat,
// metal, clear coat, the photographed room, the key, the ground below the
// horizon, each page's own turn and hue — with the object's own normal in
// place of the sphere's. Not carried over: a sphere's mirrored neighbours and
// its seams, which belong to spheres pressed together.
//
// One instanced draw per kind: every bubble shown as that kind — a page, or
// a portion under way from it — x y radius seed, from the frame's bubbles.

import { BUBBLE_FLOATS, SHADING, type FoamRenderer } from "../render/foam";
import { kindOf, OBJECT_KINDS, type ObjectKind, type ObjectParameters } from "./objects";
import { shapeOf } from "./shapes";

/** At this radius on screen (CSS px) and above, an object is drawn from its detailed mesh; below, from its light one. */
const DETAILED_FROM = 14;

const VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
uniform float size;
uniform float puff;
out vec3 surface;
out vec3 surfaceNormal;
flat out float seed;
void main() {
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
out vec4 pixel;
${SHADING}
void main() {
  setUpWorld();
  // As the composite shades a sphere's point (SPHERE_FRAGMENT), without its neighbours.
  vec3 n = normalize(surfaceNormal);
  float facing = clamp(n.z, 0.0, 1.0);
  vec3 dir = normalize(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
  mat3 turn = turnOf(seed);
  float rough = clamp(roughness * (1.0 + 0.6 * variety * (hash(vec3(seed * 61.3, 5.5, 8.8)) - 0.5)), 0.0, 1.0);
  vec3 o = toWorld(vec3(surface.xy - frame * 0.5, surface.z));
  vec3 wn = turn * toWorld(n);
  vec3 reflected = envAt(o, turn * toWorld(dir), rough);
  vec3 reflectedClear = clearcoat > 0.0 ? envAt(o, turn * toWorld(dir), rough * 0.3) : reflected;
  vec3 colour = surfaceOf(o, wn, facing, coatOf(seed), reflected, reflectedClear);
  pixel = vec4(filmic(colour * 1.25 * exposure), 1.0);
}
`;

type KindMesh = { vao: WebGLVertexArrayObject; buffers: WebGLBuffer[]; instances: WebGLBuffer; data: Float32Array; count: number; indexCount: number };

export type ObjectPass = {
  /** Draws the frame's bubbles `start` … `end` as objects, each as its page's (`pageOf`; a portion's is its source page). */
  draw(start: number, end: number, pageOf: Int32Array, parameters: ObjectParameters): void;
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
    const data = new Float32Array(maxBubbles * BUBBLE_FLOATS);
    const instances = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instances);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, BUBBLE_FLOATS * 4, 0);
    gl.vertexAttribDivisor(2, 1);
    const index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, shape.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const mesh = { vao, buffers: [positions, normals, index], instances, data, count: 0, indexCount: shape.indices.length };
    meshes.push(mesh);
    return mesh;
  };
  for (const kind of OBJECT_KINDS) levels[kind] = [build(kind, true), build(kind, false)];

  const draw: ObjectPass["draw"] = (start, end, pageOf, parameters) => {
    const bubbles = foam.bubbles;
    for (const mesh of meshes) mesh.count = 0;
    for (let index = start; index < Math.min(end, maxBubbles); index += 1) {
      const kind = kindOf(pageOf[index]!, parameters);
      if (!kind) continue;
      const from = index * BUBBLE_FLOATS;
      const mesh = levels[kind][bubbles[from + 2]! * parameters.size >= DETAILED_FROM ? 0 : 1];
      mesh.data.set(bubbles.subarray(from, from + BUBBLE_FLOATS), mesh.count * BUBBLE_FLOATS);
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
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.data, 0, mesh.count * BUBBLE_FLOATS);
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
