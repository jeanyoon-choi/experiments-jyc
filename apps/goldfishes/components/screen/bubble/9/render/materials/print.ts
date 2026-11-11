// 인쇄물 (bubble/9, user 2026-11-11: "한국적인 신문지 매거진 등 텍스쳐로 한번 입혀보는 거 — 나중에 조금 더 hyperreal
// 싼마이 텍스쳐 느낌으로 보다 파거니까 그거 염두하고"): every object pasted over with printed matter — newsprint, glossy
// covers, flyers — as papier-mâché: torn scraps at their own angles, the print following the volume.
//
// 방향 (user, 2026-11-12): the same three kinds from three bodies of print, a row of chips beside the 연출 —
// 한국 (a daily, a classified weekly, a sports daily; a weekly's cover; a supermarket flyer, a delivery menu),
// 뉴욕 (a broadsheet, a tabloid, a markets page; a city weekly's cover; a tear-off photocopy, a take-out menu, a
// gig poster) and 빅테크 (a newsroom post, terms of service, a benchmark slide; a keynote hero, a feature grid; a
// pricing page, a consent dialog over a picture test, a get-the-app poster).
//
// The sheets are made in a worker (print-sheets.ts → print-worker.ts → print-paint.ts, print-press.ts) from real
// photographs and invented copy, screened and pressed as each kind is, into one texture array for the 방향 in use.
// This file only pastes and lights them:
//   - 조각: an object is covered by up to six scraps (the nearest of that many points on it, the boundary torn by
//     noise); each scrap is its own sheet, turned and shifted its own way; a torn edge shows the paper's white core;
//   - 감김: the sheet slides outwards where the surface turns away, so print bunches towards an outline as paper
//     wrapped over a ball does, instead of lying on it as a flat decal;
//   - 종류: 신문 is uncoated and yellows (세월; 빅테크's office paper hardly does); 잡지 is coated and mirrors the
//     studio; 전단 is thin gloss paper;
//   - 구김: shallow creases break the light as pasted paper does;
//   - 색 물들임: the page's coat as a tint over the sheet (coloured newsprint, a strain of 전파).
// Cost: one texture read, and five value-noise taps for the tear and the creases (measured: docs/screen/bubble/9.md).
// Needs SHADING (hash, keyAt, irradiance, filmic …) and surface.ts (Surface, mirrorOf, noise).

import { PRINT_KINDS, PRINT_REGIONS, SHEET_COUNT } from "./print-layout";
import type { MaterialEntry } from "./surface";

const defaults = {
  printRegion: 0,
  printKind: 0,
  printScale: 0.7,
  printScraps: 3,
  printWrap: 1,
  printGloss: 0.7,
  printAge: 0.5,
  printCrumple: 0.4,
  printTint: 0,
  printSeed: 0,
};

const f = (value: number) => value.toFixed(1);

export const PRINT_MATERIAL: MaterialEntry<typeof defaults> = {
  id: 9,
  family: "print",
  familyLabel: "인쇄물 (신문 · 잡지 · 전단)",
  colourLabel: "종이",
  glsl: /* glsl */ `
uniform highp sampler2DArray printMap; // the sheets, one a layer (print-sheets.ts)
uniform float printRegion;            // 방향: 0 한국, 1 뉴욕, 2 빅테크 (which sheets are in printMap; print-sheets.ts)
uniform float printKind;              // 0 every kind, 1 신문, 2 잡지, 3 전단
uniform float printScale;             // how much of a sheet lies across an object
uniform float printScraps;            // 1 one sheet … 6 torn scraps
uniform float printWrap;              // how far the sheet follows the volume
uniform float printGloss;             // the coated papers' gloss
uniform float printAge;               // newsprint's yellowing and fibre
uniform float printCrumple;           // creases
uniform float printTint;              // the page's coat over the sheet
uniform float printSeed;              // reshuffles which sheets land where

vec3 printOf(Surface s) {
  // The sheet's own frame on the object: its disc, slid outwards where the surface turns away.
  vec2 lean = transpose(s.qTurn) * s.nS.xy;
  vec2 at = s.q + 0.45 * printWrap * lean * (1.0 - s.nS.z);
  vec2 gx = dFdx(at);
  vec2 gy = dFdy(at);
  // 조각: the nearest of a few points on it, the line between two torn by noise.
  int scraps = int(printScraps + 0.5);
  float cell = 0.0;
  float tear = 1e3;
  if (scraps > 1) {
    vec2 torn = at + 0.07 * (vec2(noise(vec3(at * 7.0, s.seed * 5.0)), noise(vec3(at * 7.0 + 4.7, s.seed * 5.0))) - 0.5);
    float best = 1e9;
    float next = 1e9;
    for (int i = 0; i < 6; i++) {
      if (i >= scraps) break;
      vec2 c = (vec2(hash(vec3(s.seed * 31.7 + float(i) * 7.13, 1.3, 2.9)), hash(vec3(s.seed * 17.9 + float(i) * 3.71, 8.1, 4.4))) - 0.5) * 1.5;
      float d = dot(torn - c, torn - c);
      if (d < best) { next = best; best = d; cell = float(i); }
      else if (d < next) next = d;
    }
    tear = (sqrt(next) - sqrt(best)) * s.radius;   // CSS px to the torn edge
  }
  float id = fract(s.seed * 5.77 + cell * 0.381966 + printSeed * 0.137);
  float pick = hash(vec3(id * 91.3, 4.1, 7.3));
  float first = 0.0;
  float count = ${f(SHEET_COUNT)};
  if (printKind > 2.5) { first = ${f(PRINT_KINDS.flyer.first)}; count = ${f(PRINT_KINDS.flyer.count)}; }
  else if (printKind > 1.5) { first = ${f(PRINT_KINDS.magazine.first)}; count = ${f(PRINT_KINDS.magazine.count)}; }
  else if (printKind > 0.5) { first = ${f(PRINT_KINDS.newspaper.first)}; count = ${f(PRINT_KINDS.newspaper.count)}; }
  float layer = first + min(floor(pick * count), count - 1.0);
  // 0 newsprint, 1 the magazine's coated stock, between them the flyer's thin gloss.
  float coated = layer >= ${f(PRINT_KINDS.flyer.first)} ? 0.55 : (layer >= ${f(PRINT_KINDS.magazine.first)} ? 1.0 : 0.0);
  float angle = (hash(vec3(id * 53.9, 2.2, 6.1)) - 0.5) * (scraps > 1 ? 1.5 : 0.5);
  mat2 turned = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * (0.69 * printScale);
  vec2 uv = turned * at + vec2(hash(vec3(id * 23.1, 9.4, 1.7)), hash(vec3(id * 67.7, 3.8, 5.5)));
  vec3 sheet = textureGrad(printMap, vec3(uv, layer), turned * gx, turned * gy).rgb;

  // Paper: newsprint yellows and shows its fibre; a torn edge shows the white core.
  vec2 px = s.q * s.radius;
  float fibre = noise(vec3(px * 0.8, s.seed * 3.0));
  float matt = 1.0 - coated;
  float aged = printAge * matt * (printRegion > 1.5 ? 0.15 : 1.0);
  vec3 paper = sheet * mix(vec3(1.0), vec3(0.93, 0.87, 0.74), aged) * (1.0 + 0.08 * aged * (fibre - 0.5));
  paper = mix(paper, paper * min(s.albedo * 1.35, vec3(1.0)), max(printTint, s.dyed));
  float whole = smoothstep(0.0, 1.8, tear);
  paper = mix(vec3(0.94, 0.92, 0.87), paper, whole);
  coated *= whole;

  // 구김: shallow creases, as pasted paper keeps.
  Surface m = s;
  if (printCrumple > 0.0) {
    float k = max(7.0, s.radius * 0.11);
    float h0 = noise(vec3(px / k, s.seed * 9.0 + cell));
    float hx = noise(vec3((px + vec2(1.2, 0.0)) / k, s.seed * 9.0 + cell));
    float hy = noise(vec3((px + vec2(0.0, 1.2)) / k, s.seed * 9.0 + cell));
    // Ridged: the slope flips along each crease.
    vec2 slope = vec2(hx - h0, hy - h0) * sign(h0 - 0.5) * 1.6 * printCrumple;
    m.nS = normalize(s.nS + vec3(s.qTurn * slope, 0.0));
    m.n = s.turn * toWorld(m.nS);
  }
  float ndl = dot(m.n, normalize(keyAt - s.o));
  float open = max(mix(1.0, s.occlusion, 0.85), 0.15) * mix(0.8, 1.0, smoothstep(0.0, 1.2, tear));
  float fresnel = pow(1.0 - s.facing, 5.0);
  vec3 body = paper * irradiance(m.o, m.n) * mix(0.64, 1.06, smoothstep(-0.5, 0.85, ndl)) * open;
  // Newsprint has only a dull sheen; coated stock mirrors the softbox.
  float gloss = coated * printGloss;
  vec3 sheen = mirrorOf(m, mix(0.6, 0.07, gloss)) * mix(0.02 + 0.1 * fresnel, 0.045 + 0.955 * fresnel, gloss) * mix(0.5, 1.0, open);
  return filmic((body * (1.0 - 0.5 * gloss * fresnel) + sheen) * exposure * 1.05);
}
`,
  call: "printOf",
  defaults,
  controls: [
    { key: "printKind", label: "종류 (0 모두 · 1 신문 · 2 잡지 · 3 전단)", min: 0, max: 3, step: 1 },
    { key: "printScale", label: "인쇄 크기 (작을수록 글자가 크게)", min: 0.15, max: 2, step: 0.01 },
    { key: "printScraps", label: "조각 수 (1 한 장)", min: 1, max: 6, step: 1 },
    { key: "printWrap", label: "감김", min: 0, max: 2, step: 0.01 },
    { key: "printGloss", label: "광택 (잡지 · 전단)", min: 0, max: 1, step: 0.01 },
    { key: "printAge", label: "세월 (신문 누렇게)", min: 0, max: 1, step: 0.01 },
    { key: "printCrumple", label: "구김", min: 0, max: 1, step: 0.01 },
    { key: "printTint", label: "색 물들임 (코팅색)", min: 0, max: 1, step: 0.01 },
    { key: "printSeed", label: "섞기", min: 0, max: 20, step: 1 },
  ],
  coatChosen: { printTint: 0.7 },
  choices: [{ key: "printRegion", label: "방향", options: PRINT_REGIONS }],
  looks: [
    // Everything at once, torn and pasted, over bubble/7's white ground.
    { id: "print", label: "인쇄물 콜라주", look: {} },
    // Newsprint alone, one sheet an object: the page read across the volume.
    { id: "print-news", label: "신문지", look: { printKind: 1, printScraps: 1, printAge: 0.7, printScale: 0.6 } },
    // Magazine covers, coated and mirroring the softbox.
    { id: "print-magazine", label: "잡지", look: { printKind: 2, printScraps: 2, printGloss: 0.9, printCrumple: 0.2 } },
    // Supermarket flyers, large and loud.
    { id: "print-flyer", label: "전단지 (싼마이)", look: { printKind: 3, printScraps: 2, printScale: 0.6, printGloss: 0.6 } },
  ],
};
