// 메시 복원 (bubble/9, user 2026-11-11: "네이버 랩스 실험과 같은 재질 … 알록달록 하게"): the look of the recovered
// human meshes in NAVER LABS Europe's Multi-HMR 2 demo — every body one flat, saturated colour of its own, lit by a
// single light at the camera, nothing mirrored — and (user, 2026-11-12) how other groups draw the same kind of
// result, each a 연출 (hmrStyle).
//
// Sources, each read in its repository's own visualisation code (2026-11-11/12; the survey with the decisive lines
// is in docs/screen/bubble/9.md):
//   0 Multi-HMR 2 (NAVER LABS Europe) — https://naverlabs.com/blogDetail?seq=10034836 ,
//     https://github.com/naver/multi-hmr-2 src/multihmr2/utils/render.py, color.py: pyrender,
//     MetallicRoughnessMaterial(metallic 0, roughness 0.5), ambient 0.3, one DirectionalLight(3) at the camera,
//     demo_color (nine colours), no tone curve (clamped).
//   1 Berkeley clay — HMR (akanazawa/hmr), 4D-Humans / HMR 2.0 (shubham-goel/4D-Humans hmr2/utils/renderer.py),
//     HaMeR, and Meta's SAM 3D Body (same renderer): LIGHT_BLUE (0.651, 0.741, 0.859), metallic 0, roughness left
//     at pyrender's default, ambient 0.3, three "raymond" DirectionalLights of 1 at 30° round the view axis.
//   2 Tri-colour lights — SAM 3D Body's renderer option tri_color_lights: the same three lights coloured
//     (1, 0.2, 0.3), (0.2, 1, 0.2), (0.2, 0.2, 1), intensity 2.
//   3 Normal map — Meta Sapiens (lite/demo/vis_normal.py), ECON (lib/common/render.py), PIFuHD: rgb = (n + 1) / 2,
//     unlit, on black.
//   4 Depth — Sapiens (vis_depth.py): 1 − normalised depth through OpenCV's INFERNO, on grey 100/255. The height
//     stands for depth here. (The colormap's stops are matplotlib's inferno as remembered, not re-read.)
//   5 Parts — Sapiens (vis_seg.py, classes_and_palettes.py): its 28-colour part palette at opacity 0.5 over the
//     picture. An object has no body parts, so it is divided into a few regions of its own.
//   6 Wireframe — VIBE (MPI-IS, lib/utils/renderer.py --wireframe: RenderFlags.ALL_WIREFRAME, a person's colour
//     hsv(random, 0.5, 1)) and MediaPipe's tesselation (drawing_styles.py: 1 px lines, no fill). A procedural
//     triangle net stands for the mesh, since an object here is a height field with no triangles.
//   7 Poster gloss — EasyMocap (Zhejiang, easymocap/visualize/pyrender_wrapper.py): metallic 0, roughness 0,
//     ambient 0.5, DirectionalLight(3) at the camera, its six colours.
// Transferred as they are: palettes, material factors, light counts, directions, colours and intensities, the
// clamp. Adapted: the raft's seams and an object's hollows are shaded a little (맞닿은 곳 그늘; the sources have no
// shadows), 조명 can turn the camera's light to the studio's key, 거칠기 차이 gives each object its own roughness,
// and a chosen coat (a chip, 섞음, the picker) replaces a style's palette.
// Needs SHADING (hash, keyScreen, lightColour, exposure) and surface.ts (Surface, noise).

import type { MaterialEntry } from "./surface";

const defaults = {
  hmrStyle: 0,
  hmrPalette: 1,
  hmrRough: 0.5,
  hmrSpread: 0,
  hmrAmbient: 0.3,
  hmrLight: 3,
  hmrKey: 0,
  hmrSeams: 0.45,
};

const vec3s = (colours: readonly string[]) =>
  colours.map((hex) => `vec3(${[0, 2, 4].map((at) => (Number.parseInt(hex.slice(at, at + 2), 16) / 255).toFixed(3)).join(", ")})`).join(", ");

/** Multi-HMR 2's color.py demo_color: cobalt, rosé, orange, green, blue, red, red, grey, violet. */
const DEMO = ["0047AB", "FF9999", "FF9933", "00CC66", "66B2FF", "FF6666", "FF3333", "C0C0C0", "9933FF"] as const;
/** EasyMocap's colours. */
const POSTER = ["5E7CE2", "FFC857", "4ABDAC", "084C61", "DB3A34", "4D2831"] as const;
/** Sapiens's part palette (classes_and_palettes.py), without its background entry. */
const PARTS = [
  "FFDA00", "80C8FF", "FF006D", "BD00CC", "FF00DA", "00A0CC", "00FF91", "CC0083", "B600FF", "FF6D00", "00FFFF", "4800FF", "CC8300", "FF0000",
  "48FF00", "BDCC00", "B6FF00", "6600CC", "2048CC", "0091FF", "0ECC00", "008048", "EBCD77", "73E370", "9D718F", "845D32", "521572",
] as const;
/** matplotlib's inferno, ten samples. */
const INFERNO = ["000004", "1B0C41", "4A0C6B", "781C6D", "A52C60", "CF4446", "ED6925", "FB9B06", "F7D13D", "FCFFA4"] as const;

export const HMR_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 8,
  family: "hmr",
  familyLabel: "메시 복원 (HMR)",
  colourLabel: "메시",
  glsl: /* glsl */ `
uniform float hmrStyle;               // whose renderer: 0 Multi-HMR 2 … 7 EasyMocap (see the file's head)
uniform float hmrPalette;             // 1 the style's own colours, one by seed; 0 the page's coat
uniform float hmrRough;               // roughnessFactor (Multi-HMR 2: 0.5)
uniform float hmrSpread;              // each object its own roughness about it
uniform float hmrAmbient;             // ambient_light (0.3)
uniform float hmrLight;               // the camera light's intensity (3)
uniform float hmrKey;                 // 0 the source's headlight (at the camera) … 1 the studio's key
uniform float hmrSeams;               // shade where spheres press and in an object's hollows (the sources: none)

const vec3 hmrDemo[${DEMO.length}] = vec3[${DEMO.length}](${vec3s(DEMO)});
const vec3 hmrPoster[${POSTER.length}] = vec3[${POSTER.length}](${vec3s(POSTER)});
const vec3 hmrParts[${PARTS.length}] = vec3[${PARTS.length}](${vec3s(PARTS)});
const vec3 hmrInferno[${INFERNO.length}] = vec3[${INFERNO.length}](${vec3s(INFERNO)});

// pyrender's dielectric (metallic 0) under one directional light: Lambert and GGX with F0 0.04.
vec3 hmrLit(vec3 base, vec3 n, vec3 l, float rough) {
  float a = rough * rough;
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float nl = max(dot(n, l), 0.0);
  float nv = max(n.z, 1e-3);
  float nh = max(dot(n, h), 0.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - max(h.z, 0.0), 5.0);
  float spread = nh * nh * (a * a - 1.0) + 1.0;
  float d = a * a / (3.1415927 * spread * spread);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float g = nl / (nl * (1.0 - k) + k) * nv / (nv * (1.0 - k) + k);
  return ((1.0 - fresnel) * base / 3.1415927 + d * fresnel * g / max(4.0 * nl * nv, 1e-3)) * nl;
}

vec3 hmrOf(Surface s) {
  int style = int(hmrStyle + 0.5);
  float pick = hash(vec3(s.seed * 91.7, 3.1, 7.7));
  float own = hmrPalette * (1.0 - s.dyed);
  float shade = mix(1.0, s.occlusion, hmrSeams);
  float gain = exposure / 0.9;        // 크롬's exposure 0.9 is the sources' 1: none of them has a tone curve
  vec3 n = s.nS;

  if (style == 3) {
    // Normal map: x right, y up, z to the viewer, unlit.
    return clamp(vec3(n.x, -n.y, n.z) * 0.5 + 0.5, 0.0, 1.0) * mix(1.0, shade, 0.5);
  }
  if (style == 4) {
    // Depth: the nearest brightest, through inferno.
    float at = clamp(s.relief / 1.05, 0.0, 1.0) * ${(INFERNO.length - 1).toFixed(1)};
    int i = min(int(at), ${INFERNO.length - 2});
    return mix(hmrInferno[i], hmrInferno[i + 1], at - float(i));
  }
  // The sheet a net or a set of regions lies on: the object's disc, slid outwards where the surface turns away.
  vec2 at = s.q + 0.45 * (transpose(s.qTurn) * n.xy) * (1.0 - n.z);
  if (style == 5) {
    // Parts: a few regions, each one of the part colours, half over what is behind.
    float cell = 0.0;
    float best = 1e9;
    vec2 torn = at + 0.1 * (vec2(noise(vec3(at * 3.0, s.seed * 5.0)), noise(vec3(at * 3.0 + 4.7, s.seed * 5.0))) - 0.5);
    for (int i = 0; i < 7; i++) {
      vec2 c = (vec2(hash(vec3(s.seed * 31.7 + float(i) * 7.13, 1.3, 2.9)), hash(vec3(s.seed * 17.9 + float(i) * 3.71, 8.1, 4.4))) - 0.5) * 1.7;
      float d = dot(torn - c, torn - c);
      if (d < best) { best = d; cell = float(i); }
    }
    vec3 part = hmrParts[min(int(hash(vec3(s.seed * 53.3 + cell * 9.7, 6.1, 2.2)) * ${PARTS.length.toFixed(1)}), ${PARTS.length - 1})];
    part = mix(s.albedo, part, own);
    return mix(s.behind, part, 0.5) * mix(1.0, shade, 0.5);
  }

  vec3 base;
  float rough = hmrRough;
  vec3 colour;
  if (style == 1 || style == 2) {
    // Three raymond lights 30° off the view axis, a third of a turn apart; roughness pyrender's default (1).
    base = mix(s.albedo, vec3(0.651, 0.741, 0.859), own);
    colour = base * 0.3;
    for (int i = 0; i < 3; i++) {
      float phi = 2.0943951 * float(i);
      vec3 l = vec3(0.5 * cos(phi), -0.5 * sin(phi), 0.8660254);
      vec3 tone = style == 1 ? vec3(1.0) : 2.0 * (i == 0 ? vec3(1.0, 0.2, 0.3) : (i == 1 ? vec3(0.2, 1.0, 0.2) : vec3(0.2, 0.2, 1.0)));
      colour += hmrLit(base, n, l, 1.0) * tone;
    }
  } else {
    float ambient = hmrAmbient;
    if (style == 7) {
      base = mix(s.albedo, hmrPoster[min(int(pick * ${POSTER.length.toFixed(1)}), ${POSTER.length - 1})], own);
      rough = 0.12;                   // the source's 0, kept wide enough for its highlight to cover a pixel
      ambient = 0.5;
    } else if (style == 6) {
      // VIBE: hsv(random, 0.5, 1).
      base = mix(s.albedo, 0.75 + 0.25 * cos(6.2831853 * (pick + vec3(0.0, 0.33, 0.67))), own);
      rough = 1.0;
    } else {
      base = mix(s.albedo, hmrDemo[min(int(pick * ${DEMO.length.toFixed(1)}), ${DEMO.length - 1})], own);
    }
    rough = clamp(rough + hmrSpread * (hash(vec3(s.seed * 47.3, 1.9, 4.2)) - 0.5), 0.08, 1.0);
    vec3 l = normalize(mix(vec3(0.0, 0.0, 1.0), keyScreen, hmrKey));
    colour = base * ambient + hmrLit(base, n, l, rough) * hmrLight;
  }
  colour = clamp(colour * shade * lightColour * gain, 0.0, 1.0);
  if (style == 6) {
    // The mesh's triangles, as lines a pixel wide in the lit colour; nothing between them.
    float cells = max(7.0, floor(s.radius / 9.0));
    vec2 g = at * cells;
    vec3 tri = vec3(g.x, g.y, g.x + g.y);
    vec3 f = abs(fract(tri) - 0.5);
    vec3 px = fwidth(tri);
    vec3 lines = 1.0 - smoothstep(vec3(0.0), px * 1.2, 0.5 - f);
    float line = max(max(lines.x, lines.y), lines.z);
    float rim = 1.0 - smoothstep(0.6, 2.2, s.edge);
    return mix(s.behind, colour * 0.82, max(line, rim));
  }
  return colour;
}
`,
  call: "hmrOf",
  defaults,
  controls: [
    { key: "hmrStyle", label: "렌더러 (0 Multi-HMR 2 · 1 버클리 · 2 삼색 · 3 노멀 · 4 깊이 · 5 부위 · 6 와이어 · 7 포스터)", min: 0, max: 7, step: 1 },
    { key: "hmrPalette", label: "원본 팔레트 (0 코팅색 · 1 소스의 색)", min: 0, max: 1, step: 1 },
    { key: "hmrRough", label: "거칠기 (Multi-HMR 2: 0.5)", min: 0.08, max: 1, step: 0.01 },
    { key: "hmrSpread", label: "거칠기 차이 (오브제마다 · 점토 … 유광)", min: 0, max: 1.6, step: 0.01 },
    { key: "hmrAmbient", label: "주변광 (소스 0.3)", min: 0, max: 1, step: 0.01 },
    { key: "hmrLight", label: "조명 세기 (소스 3)", min: 0, max: 6, step: 0.05 },
    { key: "hmrKey", label: "조명 (0 카메라에서 · 1 스튜디오 주광)", min: 0, max: 1, step: 0.01 },
    { key: "hmrSeams", label: "맞닿은 곳 그늘 (소스 0)", min: 0, max: 1, step: 0.01 },
  ],
  coatChosen: { hmrPalette: 0 },
  looks: [
    // render.py as it is, over bubble/7's white ground.
    { id: "hmr", label: "Multi-HMR 2 (네이버랩스)", look: {} },
    // Each object its own finish, dry clay to wet gloss.
    { id: "hmr-finishes", label: "Multi-HMR 2 · 재질 폭", look: { hmrSpread: 1.3, hmrRough: 0.45 } },
    // Lit by the studio's key instead of the camera: the forms turn, one side in shade.
    { id: "hmr-studio", label: "Multi-HMR 2 · 스튜디오", look: { hmrKey: 1, hmrAmbient: 0.42, hmrLight: 2.6 } },
    // 섞음's 24 hues instead of the demo's nine.
    { id: "hmr-mix", label: "Multi-HMR 2 · 섞음", look: { hmrPalette: 0, coatingMix: 1 } },
    { id: "hmr-berkeley", label: "버클리 클레이 (4D-Humans · SAM 3D Body)", look: { hmrStyle: 1 } },
    { id: "hmr-tricolour", label: "삼색 조명 (SAM 3D Body)", look: { hmrStyle: 2 } },
    { id: "hmr-normal", label: "노멀 맵 (Sapiens · ECON)", look: { hmrStyle: 3, background: [0, 0, 0], groundLight: 0, edgeShadow: 0 } },
    { id: "hmr-depth", label: "깊이 (Sapiens)", look: { hmrStyle: 4, background: [0.392, 0.392, 0.392], groundLight: 0, edgeShadow: 0 } },
    { id: "hmr-parts", label: "부위 분할 (Sapiens)", look: { hmrStyle: 5 } },
    { id: "hmr-wire", label: "와이어프레임 (VIBE · MediaPipe)", look: { hmrStyle: 6 } },
    { id: "hmr-poster", label: "포스터 유광 (EasyMocap)", look: { hmrStyle: 7 } },
  ],
};
