// One full-screen pass. Every pixel is a point (x', y') on the observer's
// "now"; the pass finds the scene event it belongs to and reads that event's
// colour out of the frame atlas.
//
//   O2  event = present + M·(0, x', y')        (M: observer → rest frame)
//   O1  compact space: the event lands in copy (i, j) of the scene, seen
//       |(i, j)·L| / C seconds in the past
//   O3  lensed position, then t -= lag(x, y)   (accumulated proper time)
//   The clip loops with its own `period`.
//
// The fixed rule never changes: the screen shows one slice of the cube. Only
// the cube's geometry (M, the lag field, the period) changes.

export const MAX_SHADER_MASSES = 16;

export const SPACETIME_VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const SPACETIME_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D atlas;
uniform vec2 atlasGrid;    // columns, rows
uniform vec2 frameSize;    // one frame, px
uniform float frames;
uniform float fps;

uniform vec2 canvas;       // device px
uniform float aspect;      // scene width in frame heights

uniform float timeNow;     // s
uniform float period;      // s, the clip's loop
uniform float compactScale; // O1: compact space circumference / frame; 1 = off
uniform vec3 restX;        // M · (0, 1, 0): (w, x, y) per observer x'
uniform vec3 restY;        // M · (0, 0, 1)
uniform float lightSpeed;  // frame heights / s

uniform int massCount;
uniform vec3 masses[${MAX_SHADER_MASSES}];  // x, y, mu (scene units)
uniform float lensGain;
uniform float softening;
uniform sampler2D lag;     // R32F, seconds, scene-aligned
uniform vec2 lagSize;
uniform float lagOn;

out vec4 colour;

vec3 frameColour(float index, vec2 uv) {
  float column = mod(index, atlasGrid.x);
  float row = floor(index / atlasGrid.x);
  vec2 inset = 0.5 / frameSize;
  vec2 inside = clamp(uv, inset, 1.0 - inset);
  return texture(atlas, (vec2(column, row) + inside) / atlasGrid).rgb;
}

float lagAt(vec2 uv) {
  vec2 p = uv * lagSize - 0.5;
  vec2 f = fract(p);
  ivec2 base = ivec2(floor(p));
  ivec2 last = ivec2(lagSize) - 1;
  float a = texelFetch(lag, clamp(base, ivec2(0), last), 0).r;
  float b = texelFetch(lag, clamp(base + ivec2(1, 0), ivec2(0), last), 0).r;
  float c = texelFetch(lag, clamp(base + ivec2(0, 1), ivec2(0), last), 0).r;
  float d = texelFetch(lag, clamp(base + ivec2(1, 1), ivec2(0), last), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  float scale = min(canvas.x / aspect, canvas.y);
  vec2 offset = (gl_FragCoord.xy - 0.5 * canvas) / scale;
  offset.y = -offset.y;

  vec3 rest = restX * offset.x + restY * offset.y;
  float t = timeNow + rest.x / lightSpeed;
  vec2 rel = rest.yz;

  if (compactScale < 0.999) {
    vec2 cell = vec2(aspect, 1.0) * compactScale;
    vec2 copyIndex = floor(rel / cell + 0.5);
    t -= length(copyIndex * cell) / lightSpeed;
    rel = (rel - copyIndex * cell) / compactScale;
  }
  vec2 scene = vec2(0.5 * aspect, 0.5) + rel;

  if (lensGain > 0.0) {
    vec2 deflection = vec2(0.0);
    for (int i = 0; i < ${MAX_SHADER_MASSES}; i += 1) {
      if (i >= massCount) break;
      vec2 d = scene - masses[i].xy;
      deflection += d * (4.0 * masses[i].z / (dot(d, d) + softening * softening));
    }
    scene -= lensGain * deflection;
  }

  vec2 uv = vec2(scene.x / aspect, scene.y);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    colour = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  if (lagOn > 0.5) t -= lagAt(uv);
  t -= period * floor(t / period);

  float f = t * fps;
  float f0 = min(floor(f), frames - 1.0);
  float f1 = f0 + 1.0;
  if (f1 >= period * fps || f1 >= frames) f1 = 0.0;
  colour = vec4(mix(frameColour(f0, uv), frameColour(f1, uv), fract(f)), 1.0);
}
`;
