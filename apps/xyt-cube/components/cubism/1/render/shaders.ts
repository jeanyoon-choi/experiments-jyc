// Full-screen passes over one volume (x, y, frame).
//
//   slice  every pixel is a point s on the cut plane, seen head-on:
//          p = centre + s.x·u + s.y·v. Beyond the frame's x, y is black; in t
//          the clip either loops or (cube pivot) ends at the box. This is the
//          projected screen (Fels, Lee & Mase's cut plane).
//   solid  the same box seen from outside: the half on the camera's side of
//          the plane is removed, so the cut face shows the slice and the
//          remaining outer faces show the clip's edges through time.
//   luma / chroma  write one decoded video frame into the volume's Y layer
//          and its half-size CbCr layer (BT.709, full range).
//
// The volume is either RGBA (phones) or Y + CbCr (screen, the mp4's own
// 4:2:0). Frames not yet loaded read as black. Each point reads its nearest
// frame (no blending in t), so unturned playback is the clip's own frames.

export const CUBISM_VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler3D volume;   // RGBA, or Y
uniform sampler3D chroma;   // CbCr when ycbcr > 0.5
uniform float ycbcr;
uniform float filled;       // texture depth loaded so far, 0..1
uniform float frames;
uniform vec3 box;           // box half sizes, frame heights
uniform vec3 axisU;
uniform vec3 axisV;
uniform vec3 axisW;
uniform vec3 centre;        // a point on the plane (screen centre)
uniform vec4 viewport;      // x, y, width, height in device px

out vec4 colour;

vec3 sampleBox(vec3 p) {
  vec3 tex = vec3(p.x / (2.0 * box.x) + 0.5, 0.5 - p.y / (2.0 * box.y), p.z / (2.0 * box.z) + 0.5);
  if (tex.z > filled) return vec3(0.0);
  tex.z = (min(floor(tex.z * frames), frames - 1.0) + 0.5) / frames;
  if (ycbcr < 0.5) return texture(volume, tex).rgb;
  float y = texture(volume, tex).r;
  vec2 c = texture(chroma, tex).rg - 0.5;
  return clamp(vec3(y + 1.5748 * c.y, y - 0.1873 * c.x - 0.4681 * c.y, y + 1.8556 * c.x), 0.0, 1.0);
}

bool insideBox(vec3 p) {
  return all(lessThanEqual(abs(p), box + 1e-5));
}
`;

export const CUBISM_SLICE_FRAGMENT = /* glsl */ `${COMMON}
uniform float aspect;
uniform float loopTime;

void main() {
  vec2 local = gl_FragCoord.xy - viewport.xy;
  float scale = min(viewport.z / aspect, viewport.w);
  vec2 s = (local - 0.5 * viewport.zw) / scale;
  vec3 p = centre + s.x * axisU + s.y * axisV;
  if (loopTime > 0.5) p.z -= 2.0 * box.z * floor((p.z + box.z) / (2.0 * box.z));
  colour = vec4(insideBox(p) ? sampleBox(p) : vec3(0.0), 1.0);
}
`;

export const CUBISM_SOLID_FRAGMENT = /* glsl */ `${COMMON}
uniform vec3 eye;
uniform vec3 eyeRight;
uniform vec3 eyeUp;
uniform vec3 eyeForward;
uniform float focal;

// 1 where p sits within 'width' of a box edge (two coordinates on the boundary).
float edge(vec3 p, float width) {
  vec3 near = step(box - width, abs(p));
  return step(1.5, near.x + near.y + near.z);
}

void main() {
  vec2 local = gl_FragCoord.xy - viewport.xy;
  vec2 ndc = (2.0 * local - viewport.zw) / viewport.w;
  vec3 dir = normalize(eyeForward * focal + eyeRight * ndc.x + eyeUp * ndc.y);

  vec3 inv = 1.0 / dir;
  vec3 a = (-box - eye) * inv;
  vec3 b = (box - eye) * inv;
  vec3 lo = min(a, b);
  vec3 hi = max(a, b);
  float t0 = max(max(lo.x, lo.y), lo.z);
  float t1 = min(min(hi.x, hi.y), hi.z);

  vec3 result = vec3(0.0);
  if (t1 <= max(t0, 0.0)) {
    colour = vec4(result, 1.0);
    return;
  }

  // Keep the half-space away from the eye: side(p) <= 0.
  float offset = dot(centre, axisW);
  float sideSign = dot(eye, axisW) - offset >= 0.0 ? 1.0 : -1.0;
  float side0 = sideSign * (dot(eye, axisW) - offset);
  float slope = sideSign * dot(dir, axisW);
  float entry = slope < 0.0 ? -side0 / slope : 1e9;
  float near = max(t0, entry);
  bool hit = near < t1;

  float pixel = 2.0 / (viewport.w * focal);
  float frontEdge = edge(eye + t0 * dir, 1.4 * pixel * t0);
  float backEdge = edge(eye + t1 * dir, 1.4 * pixel * t1);

  if (hit) {
    vec3 p = eye + near * dir;
    bool cut = entry > t0;
    result = sampleBox(p) * (cut ? 1.0 : 0.42);
    if (!cut) result = mix(result, vec3(1.0), 0.5 * frontEdge);
  } else {
    result = vec3(0.35 * backEdge);
  }
  // Edges of the removed half stay as a faint outline in front.
  if (hit && entry > t0) result = mix(result, vec3(1.0), 0.35 * frontEdge);
  if (!hit) result = max(result, vec3(0.6 * frontEdge));
  colour = vec4(result, 1.0);
}
`;

// Target texel centres map to the source: for the half-size chroma layer the
// sample lands between four source pixels, and linear filtering averages them.
export const CUBISM_YCBCR_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D frame;    // row 0 = top of the picture, like the volume
uniform vec2 target;        // layer size in texels
uniform float writeChroma;

out vec4 colour;

void main() {
  vec3 rgb = texture(frame, gl_FragCoord.xy / target).rgb;
  float y = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  colour = writeChroma > 0.5
    ? vec4((rgb.b - y) / 1.8556 + 0.5, (rgb.r - y) / 1.5748 + 0.5, 0.0, 1.0)
    : vec4(y, 0.0, 0.0, 1.0);
}
`;
