// 메시 복원 (bubble/9, user 2026-11-11: "네이버 랩스 실험과 같은 재질 … 알록달록 하게"): the look of the recovered
// human meshes in NAVER LABS Europe's Multi-HMR 2 demo — every body one flat, saturated colour of its own, lit by a
// single light at the camera, nothing mirrored.
//
// Sources, each read in its repository's own visualisation code (2026-11-11/12):
//   0 Multi-HMR 2 (NAVER LABS Europe) — https://naverlabs.com/blogDetail?seq=10034836 ,
//     https://github.com/naver/multi-hmr-2 src/multihmr2/utils/render.py, color.py: pyrender,
//     MetallicRoughnessMaterial(metallic 0, roughness 0.5), ambient 0.3, one DirectionalLight(3) at the camera,
//     demo_color (nine colours), no tone curve (clamped).
//   1 포스터 유광 — EasyMocap (Zhejiang, easymocap/visualize/pyrender_wrapper.py): metallic 0, roughness 0,
//     ambient 0.5, DirectionalLight(3) at the camera, its six colours.
// Fifteen groups' renderers were surveyed (components/bubble/docs/9.md); six more became 연출 (Berkeley clay,
// tri-colour lights, normal map, depth, parts, wireframe) and were removed again (user, 2026-11-12: keep only
// 포스터 유광 of the new ones).
// Transferred as they are: palettes, material factors, the light, the clamp. Adapted: the raft's seams and an
// object's hollows are shaded a little (맞닿은 곳 그늘; the sources have no shadows), 조명 can turn the camera's
// light to the studio's key, 거칠기 차이 gives each object its own roughness, and a chosen coat (a chip, 섞음, the
// picker) replaces a style's palette.
// Needs SHADING (hash, keyScreen, lightColour, exposure) and surface.ts (Surface).

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
export const HMR_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 8,
  family: "hmr",
  familyLabel: "메시 복원 (HMR)",
  colourLabel: "메시",
  glsl: /* glsl */ `
uniform float hmrStyle;               // whose renderer: 0 Multi-HMR 2, 1 EasyMocap
uniform float hmrPalette;             // 1 the style's own colours, one by seed; 0 the page's coat
uniform float hmrRough;               // roughnessFactor (Multi-HMR 2: 0.5)
uniform float hmrSpread;              // each object its own roughness about it
uniform float hmrAmbient;             // ambient_light (0.3)
uniform float hmrLight;               // the camera light's intensity (3)
uniform float hmrKey;                 // 0 the source's headlight (at the camera) … 1 the studio's key
uniform float hmrSeams;               // shade where spheres press and in an object's hollows (the sources: none)

const vec3 hmrDemo[${DEMO.length}] = vec3[${DEMO.length}](${vec3s(DEMO)});
const vec3 hmrPoster[${POSTER.length}] = vec3[${POSTER.length}](${vec3s(POSTER)});

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
  float pick = hash(vec3(s.seed * 91.7, 3.1, 7.7));
  float own = hmrPalette * (1.0 - s.dyed);
  vec3 base;
  float rough = hmrRough;
  float ambient = hmrAmbient;
  if (hmrStyle > 0.5) {
    base = mix(s.albedo, hmrPoster[min(int(pick * ${POSTER.length.toFixed(1)}), ${POSTER.length - 1})], own);
    rough = 0.12;                     // the source's 0, kept wide enough for its highlight to cover a pixel
    ambient = 0.5;
  } else {
    base = mix(s.albedo, hmrDemo[min(int(pick * ${DEMO.length.toFixed(1)}), ${DEMO.length - 1})], own);
  }
  rough = clamp(rough + hmrSpread * (hash(vec3(s.seed * 47.3, 1.9, 4.2)) - 0.5), 0.08, 1.0);
  // On screen: the viewer along z, the light at the camera (or turned to the key).
  vec3 l = normalize(mix(vec3(0.0, 0.0, 1.0), keyScreen, hmrKey));
  vec3 colour = base * ambient + hmrLit(base, s.nS, l, rough) * hmrLight;
  colour *= mix(1.0, s.occlusion, hmrSeams);
  // No tone curve, as the sources: the frame is clamped. (크롬's exposure 0.9 is the sources' 1.)
  return clamp(colour * lightColour * exposure / 0.9, 0.0, 1.0);
}
`,
  call: "hmrOf",
  defaults,
  controls: [
    { key: "hmrStyle", label: "렌더러 (0 Multi-HMR 2 · 1 EasyMocap)", min: 0, max: 1, step: 1 },
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
    { id: "hmr-poster", label: "포스터 유광 (EasyMocap)", look: { hmrStyle: 1 } },
  ],
};
