import type { MorphTrack } from "./track";

// One video holds both broadcasts side by side (South left, North right), so a
// single decoder keeps them on the same frame. The picture is a triangle mesh
// whose every vertex knows where it sits in each broadcast: the mesh is drawn
// at the place between the two, and each triangle carries both pictures there,
// mixed in linear light. Geometry and colour move together, so the two anchors
// become one face on the way, not two faces showing through each other.

const VERTEX_SHADER = `#version 300 es
in vec2 a_south;
in vec2 a_north;
uniform float u_share;
out vec2 v_south;
out vec2 v_north;
void main() {
  vec2 place = mix(a_south, a_north, u_share);
  v_south = a_south;
  v_north = a_north;
  gl_Position = vec4(place.x * 2.0 - 1.0, 1.0 - place.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_south;
in vec2 v_north;
uniform sampler2D u_atlas;
uniform float u_share;
// Half a texel of one atlas half, so neither side bleeds into the other.
uniform vec2 u_inset;
out vec4 outputColor;

vec3 toLinear(vec3 colour) { return pow(colour, vec3(2.2)); }

void main() {
  vec2 south = clamp(v_south, u_inset, 1.0 - u_inset);
  vec2 north = clamp(v_north, u_inset, 1.0 - u_inset);
  vec3 a = toLinear(texture(u_atlas, vec2(south.x * 0.5, south.y)).rgb);
  vec3 b = toLinear(texture(u_atlas, vec2(0.5 + north.x * 0.5, north.y)).rgb);
  outputColor = vec4(pow(mix(a, b, u_share), vec3(1.0 / 2.2)), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create tv-news shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "tv-news shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

export function createNewsMorph(gl: WebGL2RenderingContext, track: MorphTrack) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create tv-news program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "tv-news program linking failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  const vertices = new Float32Array(track.points * 4);
  const array = gl.createVertexArray();
  gl.bindVertexArray(array);
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
  const south = gl.getAttribLocation(program, "a_south");
  const north = gl.getAttribLocation(program, "a_north");
  gl.enableVertexAttribArray(south);
  gl.vertexAttribPointer(south, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(north);
  gl.vertexAttribPointer(north, 2, gl.FLOAT, false, 16, 8);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, track.triangles, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  const atlas = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uniforms = {
    share: gl.getUniformLocation(program, "u_share"),
    atlas: gl.getUniformLocation(program, "u_atlas"),
    inset: gl.getUniformLocation(program, "u_inset"),
  };
  let inset: [number, number] = [0, 0];
  let hasPicture = false;
  const take = (source: TexImageSource, width: number, height: number, frame: number) => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    inset = [1 / width, 0.5 / height];
    track.read(frame, vertices);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    hasPicture = true;
  };

  return {
    resize(width: number, height: number) {
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(width * density));
      const pixelHeight = Math.max(1, Math.round(height * density));
      if (gl.canvas.width !== pixelWidth || gl.canvas.height !== pixelHeight) {
        gl.canvas.width = pixelWidth;
        gl.canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    },
    /** Takes the video's current picture and the points measured on that frame. */
    setFrame(video: HTMLVideoElement, frame: number) {
      if (video.readyState < 2 || video.videoWidth === 0) return;
      take(video, video.videoWidth, video.videoHeight, frame);
    },
    /** Takes a still of the atlas, for a part whose video is not the one playing. */
    setStill(image: HTMLImageElement, frame: number) {
      if (!image.complete || image.naturalWidth === 0) return;
      take(image, image.naturalWidth, image.naturalHeight, frame);
    },
    /** share: 0 the South alone, 1 the North alone. */
    draw(share: number) {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!hasPicture) return;
      gl.useProgram(program);
      gl.bindVertexArray(array);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.uniform1i(uniforms.atlas, 0);
      gl.uniform1f(uniforms.share, share);
      gl.uniform2f(uniforms.inset, inset[0], inset[1]);
      gl.drawElements(gl.TRIANGLES, track.triangles.length, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);
    },
    destroy() {
      gl.deleteTexture(atlas);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteVertexArray(array);
      gl.deleteProgram(program);
    },
  };
}
