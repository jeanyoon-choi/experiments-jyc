// The compositor's one program. Every quad on every phone is an instance:
// a rect in its group's space, textured from the atlas or a solid colour,
// rounded, clipped to a rect (a feed's viewport) and to its phone's glass.
// Groups carry the motion: a pose eased into another between two moments,
// evaluated here from the time uniform, so the CPU writes a group only when
// a motion begins. Easing formulas mirror model/motion.ts.

export const FLOATS_PER_INSTANCE = 24;
export const GROUP_TEXELS = 5;
/** Groups chain up to this many parents (item → scroll → app → phone). */
export const GROUP_DEPTH = 5;
/** Each phone owns this many consecutive groups; the first is its root (the whole device). */
export const GROUPS_PER_PHONE = 64;
export const MAX_PHONES = 96;
/** A strip tile (the goldfish's tail beat) plays its frames at this many a second. */
export const STRIP_FPS = 11;

export const VERTEX = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec4 i_rect;
layout(location = 2) in vec4 i_uv;
layout(location = 3) in vec4 i_misc;   // layer, radius, group, opacity
layout(location = 4) in vec4 i_color;
layout(location = 5) in vec4 i_clip;
layout(location = 6) in vec4 i_misc2;  // clip group, phone, flags, strip frames

uniform highp sampler2D u_groups;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_phones[${MAX_PHONES}];             // glass top-left (device px), px per pt, glass radius (pt)

out vec2 v_uv;
out vec2 v_local;
flat out vec2 v_size;
flat out float v_layer;
flat out float v_radius;
flat out vec4 v_color;
flat out vec4 v_clip;
flat out vec4 v_glass;
flat out float v_glassRadius;
flat out float v_flags;
out float v_alpha;
flat out float v_scale;

float ease(float kind, float u) {
  float t = clamp(u, 0.0, 1.0);
  if (kind < 0.5) return t;
  if (kind < 1.5) return 1.0 - pow(1.0 - t, 3.0);
  if (kind < 2.5) return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  if (kind < 3.5) return t >= 1.0 ? 1.0 : 1.0 - exp(-6.0 * t) * cos(7.5 * t);
  if (kind < 4.5) return (1.0 - exp(-5.5 * t)) / (1.0 - exp(-5.5));
  if (kind < 5.5) return t * t * t;
  return t >= 1.0 ? 1.0 : 1.0 - exp(-8.0 * t) * cos(5.0 * t);
}

// One group's pose applied to a point; returns its parent (-1: none).
float applyGroup(int g, inout vec2 p, inout float alpha, inout float scale) {
  vec4 timing = texelFetch(u_groups, ivec2(0, g), 0);
  vec4 from = texelFetch(u_groups, ivec2(1, g), 0);
  vec4 to = texelFetch(u_groups, ivec2(2, g), 0);
  vec4 origin = texelFetch(u_groups, ivec2(3, g), 0);
  vec4 fade = texelFetch(u_groups, ivec2(4, g), 0);
  float span = timing.y - timing.x;
  float k = ease(timing.z, span <= 0.0 ? 1.0 : (u_time - timing.x) / span);
  vec4 pose = mix(from, to, k);
  float rot = mix(origin.z, origin.w, k);
  vec2 d = (p - origin.xy) * pose.zw;
  float c = cos(rot);
  float s = sin(rot);
  p = origin.xy + vec2(c * d.x - s * d.y, s * d.x + c * d.y) + pose.xy;
  alpha *= clamp(mix(fade.x, fade.y, k), 0.0, 1.0);
  scale *= sqrt(abs(pose.z * pose.w));
  return timing.w;
}

vec2 chain(int g, vec2 p, inout float alpha, inout float scale) {
  for (int depth = 0; depth < ${GROUP_DEPTH}; depth++) {
    if (g < 0) break;
    g = int(applyGroup(g, p, alpha, scale));
  }
  return p;
}

void main() {
  int phone = int(i_misc2.y);
  vec4 ph = u_phones[phone];
  float alpha = i_misc.w;
  float scale = 1.0;
  vec2 local = a_corner * i_rect.zw;
  vec2 p = chain(int(i_misc.z), i_rect.xy + local, alpha, scale);
  vec2 device = ph.xy + p * ph.z;

  // The feed's viewport: its corners carried by their own group.
  if (i_clip.z > i_clip.x) {
    float a = 1.0;
    float s = 1.0;
    int cg = int(i_misc2.x);
    vec2 c0 = chain(cg, i_clip.xy, a, s);
    vec2 c1 = chain(cg, i_clip.zw, a, s);
    v_clip = vec4(ph.xy + min(c0, c1) * ph.z, ph.xy + max(c0, c1) * ph.z);
  } else {
    v_clip = vec4(-1e6, -1e6, 1e6, 1e6);
  }
  // The glass moves with the phone's root group (group 0 of the phone).
  float ga = 1.0;
  float gs = 1.0;
  int root = phone * ${GROUPS_PER_PHONE};
  vec2 g0 = chain(root, vec2(0.0), ga, gs);
  vec2 g1 = chain(root, vec2(390.0, 844.0), ga, gs);
  v_glass = vec4(ph.xy + g0 * ph.z, ph.xy + g1 * ph.z);
  v_glassRadius = ph.w * ph.z * gs;

  v_uv = mix(i_uv.xy, i_uv.zw, a_corner);
  if (i_misc2.w > 0.5) {
    // A strip of frames, top to bottom: play them from the clock, each phone at its own phase.
    float frames = i_misc2.w;
    float frame = mod(floor(u_time * ${STRIP_FPS}.0 + float(phone) * 5.0), frames);
    v_uv.y = mix(i_uv.y, i_uv.w, (frame + a_corner.y) / frames);
  }
  v_local = local;
  v_size = i_rect.zw;
  v_layer = i_misc.x;
  v_radius = i_misc.y;
  v_color = i_color;
  v_flags = i_misc2.z;
  v_alpha = alpha;
  v_scale = ph.z * scale;
  vec2 ndc = device / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}
`;

export const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray u_atlas;
uniform vec2 u_resolution;

in vec2 v_uv;
in vec2 v_local;
flat in vec2 v_size;
flat in float v_layer;
flat in float v_radius;
flat in vec4 v_color;
flat in vec4 v_clip;
flat in vec4 v_glass;
flat in float v_glassRadius;
flat in float v_flags;
in float v_alpha;
flat in float v_scale;

out vec4 outColor;

float roundedBox(vec2 p, vec2 half_, float r) {
  vec2 q = abs(p) - half_ + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec4 color = v_layer >= 0.0 ? texture(u_atlas, vec3(v_uv, v_layer)) * v_color : v_color;
  float alpha = v_alpha;
  if (v_radius > 0.0) {
    float d = roundedBox(v_local - v_size * 0.5, v_size * 0.5, min(v_radius, min(v_size.x, v_size.y) * 0.5));
    alpha *= clamp(0.5 - d * v_scale, 0.0, 1.0);
  }
  vec2 fp = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 inside = min(fp - v_clip.xy, v_clip.zw - fp);
  alpha *= clamp(min(inside.x, inside.y) + 0.5, 0.0, 1.0);
  if (v_flags > 0.5) {
    vec2 center = (v_glass.xy + v_glass.zw) * 0.5;
    float d = roundedBox(fp - center, (v_glass.zw - v_glass.xy) * 0.5, v_glassRadius);
    alpha *= clamp(0.5 - d, 0.0, 1.0);
  }
  if (alpha <= 0.0) discard;
  outColor = color * alpha;
}
`;
