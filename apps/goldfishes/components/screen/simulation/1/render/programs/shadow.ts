import { COAT } from "../shading";
import { HALO } from "./halo";

// The ground round the spheres (when it reacts), drawn per sphere into two
// low-resolution targets and read back filtered, so every sphere around
// counts and nothing steps where the nearest sphere changes. Both fall off
// smoothly with the distance in radii, as a sphere's occlusion of the light
// over the ground does, so a large sphere shades further and a bead barely
// at all; there is no ring or band. First target: the colour weights' sum
// and the shade (the darkest wins), the shade's centre a little away from
// the key. Second: each sphere's colour by how near it is (adds), and the
// nearest's weight (the largest wins).
export const SHADOW_VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 bubble;  // x, y, radius, seed
uniform vec2 frame;
out vec2 local;
flat out float radius;
flat out float seed;
${HALO}
void main() {
  float extent = bubble.z + haloOf(bubble.z);
  local = (corner * 2.0 - 1.0) * extent;
  radius = bubble.z;
  seed = bubble.w;
  vec2 clip = (bubble.xy + local) / frame * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

export const SHADOW_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 local;
flat in float radius;
flat in float seed;
uniform vec3 keyScreen;               // towards the key light, on screen (z towards the camera)
layout(location = 0) out vec4 field;
layout(location = 1) out vec4 tint;
${HALO}
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
${COAT}
void main() {
  vec2 keyFlat = normalize(keyScreen.xy + vec2(1e-4, 0.0));
  float rho = max(length(local), 1e-3);
  float halo = haloOf(radius);
  if (rho - radius > halo) discard;
  // Fading out before the drawn circle's edge.
  float fade = 1.0 - smoothstep(0.7 * halo, halo, max(rho - radius, 0.0));
  // The light the sphere hides from the ground: about (r / distance)^4,
  // centred a little away from the key (further for a lower key).
  vec2 centre = -keyFlat * radius * 0.35 * (1.0 - keyScreen.z);
  float shade = 0.5 * pow(radius / max(length(local - centre), radius), 4.0) * fade;
  // Colour bounced onto the ground only right beside the sphere.
  float near = pow(radius / max(rho, radius), 10.0) * fade;
  field = vec4(0.0, 0.0, near, shade);
  tint = vec4(coatOf(seed) * near, near);
}
`;
