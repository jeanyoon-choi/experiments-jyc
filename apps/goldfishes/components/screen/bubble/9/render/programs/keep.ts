import { BODY_KEPT_MOST, float, HEIGHT_SPAN, HEIGHT_STEPS } from "../units";

// The frame kept for the next one (materials/surface.ts lastScene), at half size: its colours averaged, and the
// height and body of one of each four pixels (in eighths of a CSS px, the body's id as its fraction).
export const KEEP_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D sceneColour;
uniform highp sampler2D sceneDepth;
out vec4 kept;
void main() {
  ivec2 limit = textureSize(sceneColour, 0) - 1;
  ivec2 at = min(ivec2(gl_FragCoord.xy) * 2, limit);
  vec4 one = texelFetch(sceneColour, at, 0);
  vec3 sum = one.rgb
    + texelFetch(sceneColour, min(at + ivec2(1, 0), limit), 0).rgb
    + texelFetch(sceneColour, min(at + ivec2(0, 1), limit), 0).rgb
    + texelFetch(sceneColour, min(at + ivec2(1, 1), limit), 0).rgb;
  float height = max((0.5 - texelFetch(sceneDepth, at, 0).r) * ${float(HEIGHT_SPAN)}, 0.0);
  kept = vec4(sum * 0.25, floor(height * ${float(HEIGHT_STEPS)} + 0.5) + min(one.a, ${BODY_KEPT_MOST}));
}
`;
