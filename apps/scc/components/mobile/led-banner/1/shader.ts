export const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uSheet;
uniform vec2 uRes;
uniform float uTime;
uniform float uSheetAspect;
uniform float uScroll;
uniform int uLook;
uniform vec3 uInk;
uniform vec3 uInk2;
uniform vec3 uGround;
out vec4 frag;

const float SPEED = 1.15;   // band heights per second
const float GAP = 0.35;
const float ROWS = 34.0;    // LEDs across the band

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 hue(float h) { return clamp(abs(fract(h + vec3(0.0, 2.0, 1.0) / 3.0) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }

// Band space: x runs along the reading direction in band heights, y from the
// letters' heads (0) to their feet (1). A portrait screen is read turned.
vec2 band(out float len, out float px) {
  vec2 f = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  if (uRes.x < uRes.y) { len = uRes.y / uRes.x; px = uRes.x; return vec2(f.y, uRes.x - f.x) / uRes.x; }
  len = uRes.x / uRes.y; px = uRes.y; return f / uRes.y;
}

vec3 sheet(vec2 p, float len, float shift) {
  vec2 uv;
  if (uScroll > 0.5) {
    float period = uSheetAspect + GAP;
    float s = mod(p.x + shift - len * 0.7, period);
    uv = vec2(s / uSheetAspect, p.y);
    if (uv.x > 1.0) return vec3(0.0);
  } else {
    uv = vec2(p.x / len, p.y);
  }
  return texture(uSheet, uv).rgb;
}

void main() {
  float len, px;
  vec2 p = band(len, px);
  float shift = uTime * SPEED;
  vec3 col;

  if (uLook == 1) {
    // LED matrix: the sign moves one whole lamp at a time.
    float stepShift = floor(shift * ROWS) / ROWS;
    vec2 cell = floor(p * ROWS);
    vec2 centre = (cell + 0.5) / ROWS;
    vec3 s = sheet(centre, len, stepShift);
    float lit = smoothstep(0.4, 0.56, s.r);
    float d = length(fract(p * ROWS) - 0.5);
    float aa = ROWS / px;
    float lamp = 1.0 - smoothstep(0.39 - aa, 0.39 + aa, d);
    float core = 1.0 - smoothstep(0.0, 0.3, d);
    vec3 ink = mix(uInk, uInk2, centre.y);
    float gain = 0.9 + 0.1 * hash(cell + floor(stepShift * ROWS + 0.5));
    vec3 halo = sheet(p, len, stepShift);
    col = vec3(0.032) * lamp;
    col = mix(col, (ink + 0.16 * core) * gain, lit * lamp);
    col += ink * halo.b * 0.22 * (1.0 - lit * lamp);
  } else {
    vec3 s = sheet(p, len, shift);
    float w = max(fwidth(s.r) * 0.75, 0.002);
    float fill = smoothstep(0.5 - w, 0.5 + w, s.r);
    if (uLook == 0) {
      // Neon tube: white-hot along the middle of each stroke, tint outside.
      float hum = 0.965 + 0.035 * sin(uTime * 376.99);
      float hot = smoothstep(0.66, 0.94, s.g);
      vec3 tube = mix(uInk, vec3(1.0), 0.04 + 0.46 * hot);
      vec3 glow = uInk * (s.g * 0.3 + s.b * 0.95);
      col = mix(glow, tube, fill) * hum;
    } else if (uLook == 2) {
      col = mix(uGround, uInk, fill);
    } else if (uLook == 3) {
      float turn = step(0.5, fract(uTime * 1.25));
      col = mix(mix(uGround, uInk, fill), mix(uInk, uGround, fill), turn);
    } else {
      float along = uScroll > 0.5 ? p.x + shift : p.x;
      vec3 ink = hue(along * 0.22 - uTime * 0.25);
      col = mix(ink * (s.g * 0.2 + s.b * 0.6), mix(ink, vec3(1.0), 0.1), fill);
    }
  }
  frag = vec4(col, 1.0);
}`;

export type Program = {
  program: WebGLProgram;
  uniform: (name: string) => WebGLUniformLocation | null;
};

export function link(gl: WebGL2RenderingContext): Program | null {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  const cache = new Map<string, WebGLUniformLocation | null>();
  return {
    program,
    uniform: (name) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
      return cache.get(name)!;
    },
  };
}
