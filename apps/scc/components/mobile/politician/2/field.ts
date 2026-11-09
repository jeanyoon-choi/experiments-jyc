import type { DisplacementGrid } from "./morph";

// Four aligned portraits, four displacement fields and face-voronoi/3's moving
// lattice. Every lattice site holds its own four weights (문재인, 박근혜, 이재명,
// 윤석열): the finger's corner weights plus a private swing whose size grows
// toward the middle of the screen and vanishes at the corners. A pixel reads
// all four portraits through the thin-plate offsets at its weights, so
// geometry and colour change together. One composite face; the lattice only
// decides who is where.

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_weights;
uniform float u_spread;
uniform vec2 u_lens;
uniform float u_lensStrength;
// Screen → frame: frame = (screenTopLeft - u_frameOrigin) / u_frameSize.
uniform vec2 u_frameOrigin;
uniform vec2 u_frameSize;
uniform sampler2D u_face0;
uniform sampler2D u_face1;
uniform sampler2D u_face2;
uniform sampler2D u_face3;
// RGBA = V0.xy, V1.xy and V2.xy, V3.xy: each face's offset from the mean.
uniform sampler2D u_flowA;
uniform sampler2D u_flowB;

out vec4 outputColor;

const float TAU = 6.28318530718;
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

// A site's own four weights: the finger's corner weights, each scaled on the
// site's private phase by up to e^(±1.6·spread), then renormalised. Scaling
// (not adding) never zeroes all four at once, and a corner's one-hot weights
// stay whole whatever the spread.
vec4 siteWeights(vec2 cellId) {
  vec4 phase = vec4(
    random1(cellId + vec2(3.7, 61.3)),
    random1(cellId + vec2(41.9, 7.1)),
    random1(cellId + vec2(17.3, 29.5)),
    random1(cellId + vec2(83.1, 11.9))
  );
  vec4 weights = u_weights * exp(u_spread * 1.6 * sin(u_time * 0.42 + TAU * phase));
  return weights / max(dot(weights, vec4(1.0)), 1e-30);
}

vec3 composite(vec2 frame, vec4 flowA, vec4 flowB, vec4 weights) {
  vec2 mean = weights.x * flowA.xy + weights.y * flowA.zw + weights.z * flowB.xy + weights.w * flowB.zw;
  vec3 colour = vec3(0.0);
  if (weights.x > 0.002) colour += weights.x * toLinear(texture(u_face0, frame + flowA.xy - mean).rgb);
  if (weights.y > 0.002) colour += weights.y * toLinear(texture(u_face1, frame + flowA.zw - mean).rgb);
  if (weights.z > 0.002) colour += weights.z * toLinear(texture(u_face2, frame + flowB.xy - mean).rgb);
  if (weights.w > 0.002) colour += weights.w * toLinear(texture(u_face3, frame + flowB.zw - mean).rgb);
  float kept = dot(step(vec4(0.002), weights), weights);
  return colour / max(kept, 0.0001);
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

  vec2 point = view * 4.2 + vec2(0.0, u_time * 0.035);
  vec2 cell = floor(point);
  vec2 local = fract(point);
  const float falloff = 6.0;

  float totalWeight = 0.0;
  vec4 weightSum = vec4(0.0);
  for (int row = -2; row <= 2; row++) {
    for (int column = -2; column <= 2; column++) {
      vec2 offset = vec2(float(column), float(row));
      vec2 cellId = cell + offset;
      vec2 feature = 0.5 + 0.5 * sin(u_time * 0.6 + TAU * random2(cellId));
      vec2 featureVector = offset + feature - local;
      float weight = exp(-falloff * dot(featureVector, featureVector));
      totalWeight += weight;
      weightSum += siteWeights(cellId) * weight;
    }
  }
  // Far from every site the weights are tiny but still exact ratios; a
  // coarse floor here would divide by too much and leave black gaps.
  vec4 weights = weightSum / max(totalWeight, 1e-30);
  vec2 frame = clamp((pixel - u_frameOrigin) / u_frameSize, 0.0, 1.0);
  vec3 linearColour = composite(frame, texture(u_flowA, frame), texture(u_flowB, frame), weights);
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
  weights: [number, number, number, number];
  spread: number;
  lens: [number, number];
  lensStrength: number;
};

const FACE_UNITS = [0, 1, 2, 3] as const;

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

  const faces = FACE_UNITS.map((unit) => createTexture(gl, unit));
  const flows = [grid.first, grid.second].map((data, index) => {
    const texture = createTexture(gl, 4 + index);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, grid.width, grid.height, 0, gl.RGBA, gl.FLOAT, data);
    return texture;
  });

  const location = (name: string) => gl.getUniformLocation(program, name);
  const position = gl.getAttribLocation(program, "a_position");
  const uniforms = {
    resolution: location("u_resolution"),
    time: location("u_time"),
    weights: location("u_weights"),
    spread: location("u_spread"),
    lens: location("u_lens"),
    lensStrength: location("u_lensStrength"),
    frameOrigin: location("u_frameOrigin"),
    frameSize: location("u_frameSize"),
    faces: FACE_UNITS.map((unit) => location(`u_face${unit}`)),
    flowA: location("u_flowA"),
    flowB: location("u_flowB"),
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
    setPortrait(index: number, image: HTMLImageElement) {
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, faces[index]);
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
      gl.uniform4f(uniforms.weights, ...state.weights);
      gl.uniform1f(uniforms.spread, state.spread);
      gl.uniform2f(uniforms.lens, state.lens[0], state.lens[1]);
      gl.uniform1f(uniforms.lensStrength, state.lensStrength);
      gl.uniform2f(uniforms.frameOrigin, originX, originY);
      gl.uniform2f(uniforms.frameSize, frameWidth, frameHeight);
      [...faces, ...flows].forEach((texture, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
      });
      uniforms.faces.forEach((uniform, unit) => gl.uniform1i(uniform, unit));
      gl.uniform1i(uniforms.flowA, 4);
      gl.uniform1i(uniforms.flowB, 5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      for (const texture of [...faces, ...flows]) gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
