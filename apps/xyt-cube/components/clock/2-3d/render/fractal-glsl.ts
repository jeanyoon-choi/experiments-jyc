// GLSL for the fractal clock (../model/fractal.ts), appended to the common
// chunk: the SCC tree evaluated at each point's own time. Pre-order with
// subtree sizes, so a subtree that cannot reach the point is skipped whole.
// Every clock is drawn like the root (rim, ticks, three hands, hub), scaled
// by its radius; a moving clock's marks are widened by how far it travels
// in the point's time window, so time stays exact and the filter stays a box.

import { FRACTAL_DEPTH, FRACTAL_EXTENT, FRACTAL_NODES, FRACTAL_RATIO } from "../model/fractal";

const float = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);
const ints = (values: readonly number[]) => values.join(", ");
const floats = (values: readonly number[]) => values.map(float).join(", ");

export const FRACTAL_COUNT = FRACTAL_NODES.length;

export const FRACTAL_GLSL = /* glsl */ `
// ------------------------------------------------------------------ fractal

const int NODES = ${FRACTAL_COUNT};
const float RATIO = ${float(FRACTAL_RATIO)};
const int NODE_PARENT[NODES] = int[NODES](${ints(FRACTAL_NODES.map((node) => node.parent))});
const int NODE_HAND[NODES] = int[NODES](${ints(FRACTAL_NODES.map((node) => node.hand))});
const int NODE_DEPTH[NODES] = int[NODES](${ints(FRACTAL_NODES.map((node) => node.depth))});
const int NODE_SIZE[NODES] = int[NODES](${ints(FRACTAL_NODES.map((node) => node.size))});
const float NODE_RATE[NODES] = float[NODES](${floats(FRACTAL_NODES.map((node) => node.rate))});
const int LEVELS = ${FRACTAL_DEPTH + 1};
const float NODE_EXTENT[LEVELS] = float[LEVELS](${floats(FRACTAL_EXTENT)});
const float LEVEL_RADIUS[LEVELS] = float[LEVELS](${floats(Array.from({ length: FRACTAL_DEPTH + 1 }, (_, depth) => FRACTAL_RATIO ** depth))});

// Each node's three hand turns at z = 0 (from the page, in double precision).
uniform vec3 nodePhase[NODES];

const vec3 HAND_RATIO = HAND_LENGTH / R;
const vec3 HAND_HALF_RATIO = HAND_HALF / R;

// Hand i of a clock of radius rc at q (relative to its centre), its turn at
// z = 0 being turn0 and its rate (turns per unit z) rate; blur widens it by
// the clock's own travel in the time window.
float handOf(int i, vec3 p, vec2 q, float rc, float turn0, float rate, vec3 fx, vec3 fy, float blur) {
  float r = length(q);
  float handLength = HAND_RATIO[i] * rc;
  vec2 radial = r > 1e-6 ? q / r : vec2(0.0, 1.0);
  float lengthCover = band(r - 0.5 * handLength, 0.5 * handLength, spread(vec3(radial, 0.0), fx, fy) + blur);
  if (lengthCover <= 0.0) return 0.0;
  float half_ = asin(min(1.0, HAND_HALF_RATIO[i] * rc / max(r, 1e-6))) / TAU;
  float offset = atan(q.x, q.y) / TAU - (turn0 + p.z * rate);
  offset -= floor(offset + 0.5);
  vec3 gradient = vec3(vec2(q.y, -q.x) / max(r * r, 1e-10) / TAU, -rate);
  float window = spread(gradient, fx, fy) + abs(rate) * cutThickness() + blur / max(r, 1e-6) / TAU;
  return lengthCover * periodicBand(offset, window, half_);
}

vec3 fractal(vec3 p, vec3 fx, vec3 fy, out float marks) {
  // In pre-order a node's parent is the latest node one level up, so one
  // centre (and velocity) per level is all the state the walk needs.
  vec2 centre[LEVELS];
  vec2 velocity[LEVELS];
  float window = abs(fx.z) + abs(fy.z) + cutThickness();
  float pixelSpread = length(fx.xy) + length(fy.xy);
  vec3 c = BACKGROUND;
  marks = 0.0;
  int i = 0;
  for (int k = 0; k < NODES; k++) {
    if (i >= NODES) break;
    int parent = NODE_PARENT[i];
    int depth = NODE_DEPTH[i];
    float rc = R * LEVEL_RADIUS[depth];
    vec2 here = vec2(0.0);
    vec2 moving = vec2(0.0);
    if (parent >= 0) {
      int h = NODE_HAND[i];
      float rate = secondsPerUnit * NODE_RATE[parent] / PERIOD[h];
      float angle = TAU * (nodePhase[parent][h] + p.z * rate);
      float reach = HAND_RATIO[h] * rc / RATIO;
      here = centre[depth - 1] + reach * vec2(sin(angle), cos(angle));
      moving = velocity[depth - 1] + reach * TAU * rate * vec2(cos(angle), -sin(angle));
    }
    centre[depth] = here;
    velocity[depth] = moving;
    float blur = length(moving) * window;
    vec2 q = p.xy - here;
    float d = length(q);
    if (d > rc * NODE_EXTENT[depth] + blur + pixelSpread) {
      i += NODE_SIZE[i];
      continue;
    }
    if (d < rc * 1.02 + blur + pixelSpread) {
      // The face, scaled from the root's.
      float scale = rc / R;
      Face f = face(vec3(q / scale, p.z), fx / scale, fy / scale);
      float faceShare = faceWeight * mix(1.0, 0.7, min(float(depth), 1.0));
      c = mix(c, RIM, 0.72 * faceShare * f.rim);
      c = mix(c, RIM, 0.72 * faceShare * f.quarter);
      c = mix(c, RIM, 0.52 * faceShare * f.other);
      float strongest = max(f.rim, max(f.quarter, f.other)) * faceShare;
      for (int h = 0; h < 3; h++) {
        float rate = secondsPerUnit * NODE_RATE[i] / PERIOD[h];
        float cover = handOf(h, p, q, rc, nodePhase[i][h], rate, fx, fy, blur);
        vec3 ink = h == 0 ? HOUR : (h == 1 ? MINUTE : SECOND);
        c = mix(c, ink, 0.96 * cover);
        strongest = max(strongest, cover);
      }
      c = mix(c, MINUTE, f.hub);
      marks = max(marks, max(strongest, f.hub));
    }
    i += 1;
  }
  return c;
}
`;
