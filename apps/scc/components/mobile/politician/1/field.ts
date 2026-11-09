import type { DisplacementGrid } from "./morph";

// Two aligned portraits, one displacement field and face-voronoi/3's moving
// lattice. Every lattice site holds its own morph amount t (0 주호영, 1 추미애);
// the sites' Gaussian weights agree on t per pixel, and the pixel reads both
// portraits through the thin-plate displacement at that t, so geometry and
// colour change together.
//   face    — one composite face; the lattice only decides who is where.
//   lattice — face-voronoi/3's face-gradient 3: sites agree on one shared
//             face coordinate, then every site's own composite is sampled
//             there and mixed in linear light, so eyes meet eyes.

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bias;
uniform float u_spread;
uniform float u_mode;
uniform vec2 u_lens;
uniform float u_lensStrength;
// Screen → frame: frame = (screenTopLeft - u_frameOrigin) / u_frameSize.
uniform vec2 u_frameOrigin;
uniform vec2 u_frameSize;
uniform sampler2D u_joo;
uniform sampler2D u_choo;
uniform sampler2D u_flow;

out vec4 outputColor;

const float TAU = 6.28318530718;
// The square of the frame each lattice tile shows: forehead to chin, cheek to
// cheek. Its clamped edge is skin, so folded seams never reach the dark
// collar and blouse below the chin.
const vec2 TILE_ORIGIN = vec2(0.22, 0.2);
const vec2 TILE_SIZE = vec2(0.56, 0.42);

vec2 random2(vec2 point) {
  return fract(sin(vec2(
    dot(point, vec2(127.1, 311.7)),
    dot(point, vec2(269.5, 183.3))
  )) * 43758.5453);
}

float random1(vec2 point) {
  return fract(sin(dot(point, vec2(19.27, 43.17))) * 43758.5453);
}

vec3 toLinear(vec3 colour) { return colour * colour; }

// A site's own morph amount: its private phase swings it between the two
// faces; the finger moves the centre (bias) and the width (spread).
float siteAmount(vec2 cellId) {
  float phase = random1(cellId + vec2(3.7, 61.3));
  float swing = sin(u_time * 0.42 + TAU * phase);
  return clamp(u_bias + u_spread * 0.5 * swing, 0.0, 1.0);
}

vec3 composite(vec2 frame, float amount) {
  vec2 flow = texture(u_flow, frame).rg;
  vec3 joo = texture(u_joo, frame - amount * flow).rgb;
  vec3 choo = texture(u_choo, frame + (1.0 - amount) * flow).rgb;
  return mix(toLinear(joo), toLinear(choo), amount);
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  float shortSide = min(u_resolution.x, u_resolution.y);
  vec2 view = pixel / shortSide;

  // The finger swirls the lattice under it, as face-voronoi/3's pointer does.
  vec2 lens = u_lens * u_resolution / shortSide;
  vec2 fromLens = view - lens;
  float swirl = exp(-length(fromLens) * 4.0) * u_lensStrength;
  view += 0.65 * swirl * vec2(fromLens.y, -fromLens.x) * 0.35;

  bool lattice = u_mode > 0.5;
  vec2 point = view * (lattice ? 3.4 : 4.2) + vec2(0.0, u_time * 0.035);
  vec2 cell = floor(point);
  vec2 local = fract(point);
  float falloff = lattice ? 8.2 : 6.0;

  float totalWeight = 0.0;
  float amountSum = 0.0;
  vec2 coordinateSum = vec2(0.0);
  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 cellId = cell + offset;
      vec2 feature = 0.5 + 0.5 * sin(u_time * 0.6 + TAU * random2(cellId));
      vec2 featureVector = offset + feature - local;
      float weight = exp(-falloff * dot(featureVector, featureVector));
      totalWeight += weight;
      amountSum += siteAmount(cellId) * weight;
      coordinateSum += (0.5 - featureVector * 0.86) * weight;
    }
  }
  // Far from every site the weights are tiny but still exact ratios; a
  // coarse floor here would divide colour by too much and leave black gaps.
  totalWeight = max(totalWeight, 1e-30);

  vec3 linearColour;
  if (!lattice) {
    vec2 frame = (pixel - u_frameOrigin) / u_frameSize;
    linearColour = composite(clamp(frame, 0.0, 1.0), amountSum / totalWeight);
  } else {
    vec2 shared = clamp(coordinateSum / totalWeight, vec2(0.04), vec2(0.96));
    vec2 frame = TILE_ORIGIN + shared * TILE_SIZE;
    linearColour = vec3(0.0);
    for (int row = -2; row <= 2; row++) {
      for (int column = -2; column <= 2; column++) {
        vec2 offset = vec2(float(column), float(row));
        vec2 cellId = cell + offset;
        vec2 feature = 0.5 + 0.5 * sin(u_time * 0.6 + TAU * random2(cellId));
        vec2 featureVector = offset + feature - local;
        float weight = exp(-falloff * dot(featureVector, featureVector));
        linearColour += composite(frame, siteAmount(cellId)) * weight;
      }
    }
    linearColour /= totalWeight;
  }
  outputColor = vec4(sqrt(linearColour), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create politician shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Politician shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createTexture(gl: WebGL2RenderingContext, unit: number) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Could not create politician texture");
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // A dark pixel until the portraits arrive.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 22, 30, 255]));
  return texture;
}

export type FieldState = {
  time: number;
  bias: number;
  spread: number;
  mode: "face" | "lattice";
  lens: [number, number];
  lensStrength: number;
};

export function createPoliticianField(gl: WebGL2RenderingContext, grid: DisplacementGrid) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create politician program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Politician program linking failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const joo = createTexture(gl, 0);
  const choo = createTexture(gl, 1);
  const flow = createTexture(gl, 2);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, flow);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, grid.width, grid.height, 0, gl.RG, gl.FLOAT, grid.data);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);

  const location = (name: string) => gl.getUniformLocation(program, name);
  const position = gl.getAttribLocation(program, "a_position");
  const uniforms = {
    resolution: location("u_resolution"),
    time: location("u_time"),
    bias: location("u_bias"),
    spread: location("u_spread"),
    mode: location("u_mode"),
    lens: location("u_lens"),
    lensStrength: location("u_lensStrength"),
    frameOrigin: location("u_frameOrigin"),
    frameSize: location("u_frameSize"),
    joo: location("u_joo"),
    choo: location("u_choo"),
    flow: location("u_flow"),
  };

  return {
    // Full device resolution up to 2×; quality below 1 is the frame-time fallback.
    resize(width: number, height: number, quality: number) {
      const density = Math.min(window.devicePixelRatio || 1, 2) * quality;
      const pixelWidth = Math.max(1, Math.round(width * density));
      const pixelHeight = Math.max(1, Math.round(height * density));
      if (gl.canvas.width !== pixelWidth || gl.canvas.height !== pixelHeight) {
        gl.canvas.width = pixelWidth;
        gl.canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    },
    setPortrait(which: "joo" | "choo", image: HTMLImageElement) {
      gl.activeTexture(which === "joo" ? gl.TEXTURE0 : gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, which === "joo" ? joo : choo);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    },
    draw(state: FieldState) {
      const width = gl.canvas.width;
      const height = gl.canvas.height;
      // Cover the screen with the 3:4 frame, anchored on the face (frame y 0.47)
      // so a landscape window crops hair and suit rather than the face.
      const frameWidth = Math.max(width, height * (900 / 1200));
      const frameHeight = frameWidth * (1200 / 900);
      const originX = (width - frameWidth) / 2;
      const originY = Math.min(0, Math.max(height - frameHeight, height / 2 - frameHeight * 0.47));

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform1f(uniforms.time, state.time);
      gl.uniform1f(uniforms.bias, state.bias);
      gl.uniform1f(uniforms.spread, state.spread);
      gl.uniform1f(uniforms.mode, state.mode === "lattice" ? 1 : 0);
      gl.uniform2f(uniforms.lens, state.lens[0], state.lens[1]);
      gl.uniform1f(uniforms.lensStrength, state.lensStrength);
      gl.uniform2f(uniforms.frameOrigin, originX, originY);
      gl.uniform2f(uniforms.frameSize, frameWidth, frameHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, joo);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, choo);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, flow);
      gl.uniform1i(uniforms.joo, 0);
      gl.uniform1i(uniforms.choo, 1);
      gl.uniform1i(uniforms.flow, 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteTexture(joo);
      gl.deleteTexture(choo);
      gl.deleteTexture(flow);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
