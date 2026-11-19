// The spheres, at full resolution: each pixel gathers the bubbles the ownership passes found round it, decides
// exactly which owns it and how far its free face and nearest wall are, and shades it — the coat (material 0)
// here, any other material through one Surface (materials/). Its height goes to the frame's depth, its body's id
// to the frame's alpha (units.ts).

import { SHADING } from "../shading";
import { float, HEIGHT_SPAN, NEIGHBOUR_TEXELS, ROW } from "../units";
import { HALO } from "./halo";

export const SPHERE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 uv;
uniform highp sampler2D first;
uniform highp sampler2D second;
uniform float cssPerPixel;            // one device pixel, in CSS px
uniform highp sampler2D bubbleData;   // per bubble: x, y, radius, seed
uniform highp sampler2D neighbours;   // per bubble: indices (from 1) of the bubbles it overlaps
uniform sampler2D liquidField;        // round the spheres: colour weights' sum, shade (SHADOW_FRAGMENT)
uniform sampler2D liquidTint;         // round the spheres: their colours by nearness, the nearest's weight
out vec4 pixel;
${HALO}
${SHADING}

vec4 bubbleAt(float index) {
  int i = int(index) - 1;
  return texelFetch(bubbleData, ivec2(i % ${ROW}, i / ${ROW}), 0);
}

float own(vec4 b, vec2 p) {
  if (b.z <= 0.0) return 1e9;
  vec2 d = p - b.xy;
  return dot(d, d) / b.z - b.z;
}

void main() {
  setUpWorld();
  vec2 p = vec2(uv.x, 1.0 - uv.y) * frame;
  // The passes are per texel at a coarser grid; gather every bubble they
  // found around this pixel and decide exactly here, so walls fall where the
  // geometry puts them, not on the texel grid.
  ivec2 centre = ivec2(uv * vec2(textureSize(first, 0)));
  ivec2 limit = textureSize(first, 0) - 1;
  vec4 found[18];
  int count = 0;
  // Nearest bubbles first: where none lies around, this is open ground and
  // the second layer is never read.
  for (int layer = 0; layer < 2; layer += 1) {
    if (layer == 1 && count == 0) break;
    for (int y = -1; y <= 1; y += 1) {
      for (int x = -1; x <= 1; x += 1) {
        ivec2 at = clamp(centre + ivec2(x, y), ivec2(0), limit);
        vec4 c = layer == 0 ? texelFetch(first, at, 0) : texelFetch(second, at, 0);
        // Repeats are harmless (they give the same distances), so they are
        // kept rather than searched for.
        if (c.z <= 0.0) continue;
        found[count] = c;
        count += 1;
      }
    }
  }
  // Open ground: nothing else to compute.
  if (count == 0) {
    pixel = vec4(background, 0.0);
    gl_FragDepth = 1.0;
    return;
  }
  vec4 a = vec4(0.0);
  float fa = 1e9;
  for (int i = 0; i < 18; i += 1) {
    if (i >= count) break;
    float f = own(found[i], p);
    if (f < fa) {
      fa = f;
      a = found[i];
    }
  }
  // Distances in px, each from f's own gradient: to the free face (f = 0)
  // and to the nearest wall with any neighbour that overlaps here. Taking
  // the nearest over all neighbours keeps the surface whole where the
  // second-nearest bubble changes.
  vec2 da = p - a.xy;
  float rho = max(length(da), 1e-3);
  float slopeA = max(2.0 * rho / max(a.z, 1e-3), 1e-3);
  float toFace = -fa / slopeA;
  // The distance's gradient, exactly (toFace = (r² − ρ²) / 2ρ), and for the
  // nearest wall that of the wall distance.
  vec2 edgeGradient = -(a.z * a.z + rho * rho) / (2.0 * rho * rho) * (da / rho);
  // The nearest wall over every bubble this one overlaps — the same list for
  // all of its pixels, so the surface never changes with the texel grid.
  float toWall = 1e4;
  vec2 wallGradient = vec2(0.0);
  int self = int(a.w) - 1;
  for (int t = 0; t < ${NEIGHBOUR_TEXELS}; t += 1) {
    vec4 ids = texelFetch(neighbours, ivec2((self % ${ROW}) * ${NEIGHBOUR_TEXELS} + t, self / ${ROW}), 0);
    for (int k = 0; k < 4; k += 1) {
    float id = ids[k];
    if (id <= 0.0) continue;
    vec4 c = bubbleAt(id);
    float fc = own(c, p);
    if (fc >= 0.0) continue;
    vec2 dc = p - c.xy;
    vec2 gradient = 2.0 * da / a.z - 2.0 * dc / c.z;
    float g = max(length(gradient), 1e-3);
    float candidate = (fc - fa) / g;
    if (candidate < toWall) {
      toWall = candidate;
      wallGradient = -gradient / g;
    }
    }
  }
  float toEdge = min(toFace, toWall);
  if (toWall < toFace) edgeGradient = wallGradient;
  float rr = max(a.z, 1e-3);
  float seedRaw = bubbleAt(a.w).w;
  vec3 coat = coatOf(seedRaw);

  // The ground round the sphere (only where some of this pixel is ground).
  float cover = clamp(toFace / cssPerPixel + 0.5, 0.0, 1.0);
  vec3 ground = background;
  if (cover < 1.0 && groundHalo > 0.5) {
    vec4 field = texture(liquidField, uv);
    vec4 near = texture(liquidTint, uv);
    ground *= 1.0 - edgeShadow * field.w;
    // The spheres' colour, bounced onto the ground next to them.
    vec3 nearCoat = near.rgb / max(field.z, 1e-3);
    ground = mix(ground, ground * mix(vec3(1.0), nearCoat * 1.6 + 0.08, 0.6), colourBleed * near.a);
  }
  if (cover <= 0.0) {
    pixel = vec4(ground, 0.0);
    gl_FragDepth = 1.0;
    return;
  }

  // 재질 (bubble/8, render/materials): every material but the coat shades the sphere from one Surface — a ball,
  // darkened into the seams where it presses its neighbours. (액체 막's flat cap went with 액체: user, 2026-11-11.)
  if (material > 0.5) {
    vec2 ballAt = da / rr;
    vec3 ball = vec3(ballAt, sqrt(max(1.0 - dot(ballAt, ballAt), 0.0)));
    vec3 nS = ball;
    float lift = ball.z * rr;
    float seam = toWall < toFace ? smoothstep(0.0, 0.35 * rr, toWall) : 1.0;
    Surface sf;
    sf.o = toWorld(vec3(p - frame * 0.5, lift));
    sf.nS = nS;
    sf.turn = turnOf(seedRaw);
    sf.n = sf.turn * toWorld(nS);
    sf.facing = clamp(nS.z, 0.0, 1.0);
    sf.albedo = coat;
    sf.dyed = 0.0;
    sf.occlusion = mix(0.3, 1.0, seam);
    sf.grainAt = vec3(da * 1.6, seedRaw * 13.0);
    sf.q = da / rr;
    sf.qTurn = mat2(1.0);
    sf.seed = seedRaw;
    sf.radius = rr;
    sf.edge = toEdge;
    sf.relief = ball.z;
    sf.behind = ground;
    sf.melt = 0.0;
    sf.body = bodyId(seedRaw, 0.0);
    pixel = vec4(mix(ground, shadeMaterial(sf), cover), cover >= 0.5 ? sf.body : 0.0);
    gl_FragDepth = cover >= 0.5 ? 0.5 - lift / ${float(HEIGHT_SPAN)} : 1.0;
    return;
  }

  // The sphere: round to its edge; where it presses against a neighbour the
  // two meet in one narrow dark seam, turned down only over the last few
  // pixels so the seam is smooth at any size.
  vec2 out2 = da / rr;
  vec3 round3 = vec3(out2, sqrt(max(1.0 - dot(out2, out2), 0.0)));
  float seamWidth = (min(0.05 * rr, 4.0) + 1.0) * mix(0.5, 1.6, crease);
  float riseM = clamp(toEdge / seamWidth, 0.0, 1.0);
  float hM = sqrt(max(1.0 - (1.0 - riseM) * (1.0 - riseM), 0.0));
  vec3 pinched = normalize(vec3(-min((1.0 - riseM) / max(hM, 0.05), 20.0) * edgeGradient, 1.0));
  float atWall = toWall < toFace ? 1.0 - riseM : 0.0;
  vec3 n = normalize(mix(round3, pinched, atWall * atWall * (3.0 - 2.0 * atWall)));
  float facing = clamp(n.z, 0.0, 1.0);
  vec3 dir = normalize(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
  mat3 turn = turnOf(seedRaw);
  float rough = clamp(roughness * (1.0 + 0.6 * variety * (hash(vec3(seedRaw * 61.3, 5.5, 8.8)) - 0.5)), 0.0, 1.0);
  // The reflected ray, traced against the neighbouring spheres (centres on
  // one plane, the surface point raised by the sphere's own curvature). A
  // hit shows that sphere — its coat, its own reflection — darkened deep in
  // the seam, where light barely reaches.
  vec3 from = vec3(p, n.z * rr);
  float nearest = 1e9;
  vec4 hit = vec4(0.0);
  for (int t = 0; t < ${NEIGHBOUR_TEXELS}; t += 1) {
    vec4 ids = texelFetch(neighbours, ivec2((self % ${ROW}) * ${NEIGHBOUR_TEXELS} + t, self / ${ROW}), 0);
    for (int k = 0; k < 4; k += 1) {
      float id = ids[k];
      if (id <= 0.0) continue;
      vec4 c = bubbleAt(id);
      vec3 oc = from - vec3(c.xy, 0.0);
      float b = dot(oc, dir);
      float cc = dot(oc, oc) - c.z * c.z;
      float disc = b * b - cc;
      if (cc <= 0.0 || disc <= 0.0) continue;
      float along = -b - sqrt(disc);
      if (along > 0.5 && along < nearest) {
        nearest = along;
        hit = c;
      }
    }
  }
  vec2 half2 = frame * 0.5;
  vec3 o = toWorld(vec3(from.xy - half2, from.z));
  vec3 wn = turn * toWorld(n);
  vec3 reflected = envAt(o, turn * toWorld(dir), rough);
  vec3 reflectedClear = clearcoat > 0.0 ? envAt(o, turn * toWorld(dir), rough * 0.3) : reflected;
  if (nearest < 1e8) {
    vec3 at = from + dir * nearest;
    vec3 n2 = normalize(at - vec3(hit.xy, 0.0));
    vec3 o2 = toWorld(vec3(at.xy - half2, at.z));
    vec3 seen = envAt(o2, turn * toWorld(reflect(dir, n2)), rough);
    // Seen through its own coat as well; the second tint is softened (a hue
    // that drifts red reads as a different colour, not as depth).
    vec3 other = surfaceOf(o2, turn * toWorld(n2), abs(dot(dir, n2)), sqrt(coatOf(hit.w)), seen, seen) * mix(0.55, 1.0, smoothstep(0.0, 0.35 * rr, nearest));
    // A rough surface blurs its neighbours away with the rest of what it reflects.
    float mirrored = neighbourReflection * (1.0 - smoothstep(0.3, 1.0, rough));
    reflected = mix(reflected, other, mirrored);
    reflectedClear = mix(reflectedClear, other, neighbourReflection * (1.0 - smoothstep(0.3, 1.0, rough * 0.3)));
  }
  vec3 colour = surfaceOf(o, wn, facing, coat, reflected, reflectedClear);
  // Deep in a seam little light arrives at all.
  colour *= mix(mix(0.5, 0.05, crease), 1.0, smoothstep(0.0, 2.5 * seamWidth, toWall));
  vec3 shown = filmic(colour * 1.25 * exposure);
  // A crisp silhouette: anti-aliased over one device pixel.
  pixel = vec4(mix(ground, shown, cover), cover >= 0.5 ? bodyId(seedRaw, 0.0) : 0.0);
  // Its height as depth, so what is drawn after in the raft's frame (objects/) passes behind it where it is lower.
  gl_FragDepth = cover >= 0.5 ? 0.5 - from.z / ${float(HEIGHT_SPAN)} : 1.0;
}
`;
