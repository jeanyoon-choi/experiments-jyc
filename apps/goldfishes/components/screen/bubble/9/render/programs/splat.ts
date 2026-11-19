// The ownership passes: every bubble draws a square around itself (and, when the ground reacts, its halo there)
// twice with depth testing on f — the first pass keeps each pixel's bubble, the second the next one (foam.ts).

import { HALO } from "./halo";

export const SPLAT_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
out vec2 local;
flat out vec4 disc;
${HALO}
void main() {
  float extent = bubble.z + haloOf(bubble.z);
  local = (corner * 2.0 - 1.0) * extent;
  // Its index (from 1) travels with it, so the composite can look up its data.
  disc = vec4(bubble.xyz, float(gl_InstanceID) + 1.0);
  vec2 clip = (bubble.xy + local) / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

export const SPLAT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in vec4 disc;
uniform highp sampler2D first;
uniform bool second;
out vec4 result;
${HALO}
void main() {
  float f = dot(local, local) / disc.z - disc.z;
  if (length(local) > disc.z + haloOf(disc.z)) discard;
  if (second) {
    vec4 found = texelFetch(first, ivec2(gl_FragCoord.xy), 0);
    if (found.z > 0.0 && distance(found.xy, disc.xy) < 1e-3 && abs(found.z - disc.z) < 1e-3) discard;
  }
  gl_FragDepth = clamp((f + 8192.0) / 16384.0, 0.0, 1.0);
  result = disc;
}
`;
