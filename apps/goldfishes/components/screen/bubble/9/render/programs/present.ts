import { float, HEIGHT_SPAN } from "../units";

// The frame, onto the canvas. 맞닿은 틈, between bodies (user, 2026-11-17): where an object meets another body at
// one height (they stand in one another; not one in front of the other), their colours run into each other over
// `reach` device px, as a rounded join does, instead of ending on a cut line. Only across the join: a body's own
// texture is never blurred, nor its outline on the ground, nor the seams between the raft's spheres.
export const PRESENT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D sceneColour;        // a: the body's id (SHADING bodyId)
uniform highp sampler2D sceneDepth;
uniform float reach;
uniform float cssPerPixel;
out vec4 pixel;
float heightAt(ivec2 at) {
  return max((0.5 - texelFetch(sceneDepth, at, 0).r) * ${float(HEIGHT_SPAN)}, 0.0);
}
void main() {
  ivec2 at = ivec2(gl_FragCoord.xy);
  vec4 here = texelFetch(sceneColour, at, 0);
  pixel = vec4(here.rgb, 1.0);
  if (reach <= 0.0 || here.a <= 0.0) return;
  ivec2 limit = textureSize(sceneColour, 0) - 1;
  float height = -1.0;
  vec3 sum = here.rgb * 2.0;
  float weight = 2.0;
  for (int i = 0; i < 8; i += 1) {
    float ring = i < 4 ? 0.5 : 1.0;
    float angle = (float(i) + (i < 4 ? 0.0 : 0.5)) * 1.5707963;
    vec2 off = vec2(cos(angle), sin(angle)) * reach * ring;
    ivec2 tap = clamp(at + ivec2(round(off)), ivec2(0), limit);
    vec4 other = texelFetch(sceneColour, tap, 0);
    float w = i < 4 ? 1.5 : 1.0;
    weight += w;
    bool joined = other.a > 0.0 && abs(other.a - here.a) > 0.002 && max(other.a, here.a) >= 0.5;
    if (joined) {
      if (height < 0.0) height = heightAt(at);
      joined = abs(heightAt(tap) - height) < 2.5 * length(off) * cssPerPixel + 1.5;
    }
    sum += w * (joined ? other.rgb : here.rgb);
  }
  pixel = vec4(sum / weight, 1.0);
}
`;
