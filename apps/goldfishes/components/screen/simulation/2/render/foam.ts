// Rank as a raft of coated spheres (bubble/8: or of any material in render/materials). Every page is a bubble whose area is its
// displayed rank; the bubbles float together and press into one another.
//
// Shape follows planar soap-bubble geometry (Plateau's laws as in
// LittleBadger/bubbles): bubble i owns the points where
//   f_i(p) = |p − c_i|² / r_i − r_i
// is the smallest and negative. A free face is then a circle of radius r_i,
// and the wall between two bubbles is a circular arc whose curvature follows
// their pressure difference, bowing into the larger one; at the contact
// distance √(r₁² + r₂² − r₁r₂) walls meet three at a time at 120°. The
// layout (this route's copy) keeps touching bubbles at that distance.
//
// On the GPU, at a share of the CSS resolution, every bubble draws a square
// around itself (and, when the ground reacts, its halo there) twice with
// depth testing on f: the first pass keeps each pixel's bubble, the second
// the next one. The composite, at full resolution, recomputes both exactly
// and shades each bubble as a sphere. No meshes: the sphere's normal comes
// from its disc, and reflected rays are traced analytically against the
// neighbouring spheres.
//
// The parameters are those of a physically based material and its
// surroundings (three.js MeshPhysicalMaterial and an environment map have
// the same ones), so a look carries over if the spheres become 3D objects:
// the coat's colour, metalness, roughness and clear coat; a photographed
// room (CC0 HDRI) and a key light, turned together; the ground the spheres
// rest on, of the background's colour, reflected below the horizon; and the
// camera's tilt, from straight above (the horizon runs round every rim: the
// spheres float in a tank) to the side (bubble/2: the horizon crosses them).
// Nothing persists between frames but the frame itself: the raft is drawn into a texture with its heights as depth
// (what is drawn after it, objects/, shades only its nearest surface from them), shown by present(), and kept at
// half size for the next frame's surfaces to see their neighbours in (materials/surface.ts lastScene).
//
// This file is the composition: the targets, the passes in order, and what is shown. The programs' GLSL is in
// programs/, the units and encodings they share in units.ts, the plumbing in gl.ts, the neighbour lists in
// neighbours.ts, the rooms, stills and sheets in assets.ts, a look's uniforms in look.ts.

import { createAssets } from "./assets";
import { compile, createUniforms, sampling } from "./gl";
import { applyLook, LOOK_DEFAULTS, type Look } from "./look";
import { materialOf } from "./materials";
import { createNeighbourSweep } from "./neighbours";
import { KEEP_FRAGMENT, PRESENT_FRAGMENT, SCREEN_VERTEX, SHADOW_FRAGMENT, SHADOW_VERTEX, SPHERE_FRAGMENT, SPLAT_FRAGMENT, SPLAT_VERTEX } from "./programs";
import { BUBBLE_FLOATS, MAX_BUBBLES, NEIGHBOUR_TEXELS, ROW, UNIT } from "./units";

export { LOOK_DEFAULTS, type Colour, type Look } from "./look";
export { BUBBLE_FLOATS, MAX_BUBBLES } from "./units";

/** The ownership passes run at this share of the CSS resolution. */
const SCALE = 0.75;

// Each program's samplers and the units they read (units.ts), set once per program (gl.ts samplers).
const SPLAT_SAMPLERS = { first: UNIT.first };
const SPHERE_SAMPLERS = { first: UNIT.first, second: UNIT.second, bubbleData: UNIT.bubbleData, neighbours: UNIT.neighbours, liquidField: UNIT.shadowField, liquidTint: UNIT.shadowTint };
/** Of every program that includes SHADING (the spheres' and, through shade(), the objects'). */
const SHADING_SAMPLERS = { plates: UNIT.plates, printMap: UNIT.printMap, lightMap: UNIT.lightMap, lastScene: UNIT.lastScene };
const SCENE_SAMPLERS = { sceneColour: UNIT.sceneColour, sceneDepth: UNIT.sceneDepth };

export type FoamRenderer = {
  /** Per bubble: x y radius seed (CSS px; seed in [0, 1)). */
  readonly bubbles: Float32Array;
  resize(width: number, height: number, ratio: number): void;
  /** Draws the bubbles `from` … `bubbleCount` (by default all from the first). */
  render(bubbleCount: number, look?: Look, from?: number): void;
  /** For passes drawn over the raft in its material (objects/): the context, a program from shaders that include SHADING, */
  readonly gl: WebGL2RenderingContext;
  program(vertex: string, fragment: string): WebGLProgram;
  /** the last frame's look set on such a program (in use), and the field in CSS px and the canvas in device pixels. */
  shade(program: WebGLProgram): void;
  /** That look's material (0: the coat), for what a pass need not work out under another. */
  material(): number;
  size(): { width: number; height: number; pixelWidth: number; pixelHeight: number };
  /**
   * Where what is drawn after the raft goes: `heights` the frame's heights as depth with `winners` as its colour
   * (cleared each frame: what a pass writes there is which of its instances won each pixel), then `colour`, the
   * frame alone, to shade into while reading `winners`.
   */
  targets(): { heights: WebGLFramebuffer; colour: WebGLFramebuffer; winners: WebGLTexture };
  /** Shows the frame on the canvas and keeps it for the next (after everything is drawn; `look` for 맞닿은 틈). */
  present(look?: Look): void;
  /** Whether every room, still and sheet asked for is in (loop/replay.ts `?replay`). */
  loaded(): boolean;
  /** The materials' clock, in seconds, in place of the page's (loop/replay.ts `?replay`). */
  setClock(clock: () => number): void;
  /** Waits for the GPU to finish the last frame (measurement only). */
  sync(): void;
  dispose(): void;
};

export function createFoamRenderer(canvas: HTMLCanvasElement): FoamRenderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl || gl.getExtension("EXT_color_buffer_float") === null) return null;

  const splatProgram = compile(gl, SPLAT_VERTEX, SPLAT_FRAGMENT);
  const shadowProgram = compile(gl, SHADOW_VERTEX, SHADOW_FRAGMENT);
  const sphereProgram = compile(gl, SCREEN_VERTEX, SPHERE_FRAGMENT);
  const keepProgram = compile(gl, SCREEN_VERTEX, KEEP_FRAGMENT);
  const presentProgram = compile(gl, SCREEN_VERTEX, PRESENT_FRAGMENT);
  // The kept frame's blur is its mips, which a float texture has only where it can be filtered.
  const floatLinear = gl.getExtension("OES_texture_float_linear") !== null;
  const uniforms = createUniforms(gl);
  const location = uniforms.at;

  const square = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const screen = gl.createVertexArray();
  gl.bindVertexArray(screen);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const all = new Float32Array(MAX_BUBBLES * BUBBLE_FLOATS);
  const bubbleBuffer = gl.createBuffer();
  const bubbleMesh = gl.createVertexArray();
  gl.bindVertexArray(bubbleMesh);
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bubbleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, all.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, BUBBLE_FLOATS * 4, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.bindVertexArray(null);

  const dataTexture = (width: number, height: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    sampling(gl, gl.TEXTURE_2D, gl.NEAREST, gl.NEAREST);
    return texture;
  };
  const bubbleData = dataTexture(ROW, MAX_BUBBLES / ROW);
  const neighbourData = dataTexture(ROW * NEIGHBOUR_TEXELS, MAX_BUBBLES / ROW);
  const neighboursOf = createNeighbourSweep();

  const assets = createAssets(gl);

  type Layer = { texture: WebGLTexture; target: WebGLFramebuffer };
  const depth = gl.createRenderbuffer();
  const layers = [
    { texture: gl.createTexture(), target: gl.createFramebuffer() },
    { texture: gl.createTexture(), target: gl.createFramebuffer() },
  ] as const satisfies readonly Layer[];
  const shadow = { field: gl.createTexture(), tint: gl.createTexture(), target: gl.createFramebuffer() };
  // The frame (colour, the body's id in its alpha; heights as depth) and the last one, kept at half size.
  const scene = { colour: gl.createTexture(), depth: gl.createTexture(), winners: gl.createTexture(), full: gl.createFramebuffer(), shaded: gl.createFramebuffer(), heights: gl.createFramebuffer() };
  const last = { texture: gl.createTexture(), target: gl.createFramebuffer(), width: 1, height: 1 };
  // The field in CSS px and the canvas in device pixels (size()), and the ownership passes' grid; changed in place by resize.
  const size = { width: 1, height: 1, pixelWidth: 1, pixelHeight: 1 };
  const sim = { width: 1, height: 1 };
  const targets = { heights: scene.heights, colour: scene.shaded, winners: scene.winners };

  const resize: FoamRenderer["resize"] = (width, height, ratio) => {
    size.width = Math.max(1, width);
    size.height = Math.max(1, height);
    size.pixelWidth = Math.max(1, Math.round(width * ratio));
    size.pixelHeight = Math.max(1, Math.round(height * ratio));
    sim.width = Math.max(1, Math.round(width * SCALE));
    sim.height = Math.max(1, Math.round(height * SCALE));
    canvas.width = size.pixelWidth;
    canvas.height = size.pixelHeight;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, sim.width, sim.height);
    for (const layer of layers) {
      gl.bindTexture(gl.TEXTURE_2D, layer.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, sim.width, sim.height, 0, gl.RGBA, gl.FLOAT, null);
      sampling(gl, gl.TEXTURE_2D, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.target);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layer.texture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.target);
    for (const [at, texture] of [shadow.field, shadow.tint].entries()) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, sim.width, sim.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      sampling(gl, gl.TEXTURE_2D, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + at, gl.TEXTURE_2D, texture, 0);
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    const plain = (texture: WebGLTexture, filter: number) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      sampling(gl, gl.TEXTURE_2D, filter, filter === gl.NEAREST ? gl.NEAREST : gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    };
    plain(scene.colour, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size.pixelWidth, size.pixelHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    plain(scene.depth, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size.pixelWidth, size.pixelHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.full);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scene.colour, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, scene.depth, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.shaded);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scene.colour, 0);
    plain(scene.winners, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size.pixelWidth, size.pixelHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.heights);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scene.winners, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, scene.depth, 0);
    last.width = Math.max(1, Math.ceil(size.pixelWidth / 2));
    last.height = Math.max(1, Math.ceil(size.pixelHeight / 2));
    plain(last.texture, floatLinear ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST);
    // Empty until the first frame is kept: no height anywhere, so nothing is met.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, last.width, last.height, 0, gl.RGBA, gl.FLOAT, null);
    if (floatLinear) gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindFramebuffer(gl.FRAMEBUFFER, last.target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, last.texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  let lastLook = LOOK_DEFAULTS;
  let clock: (() => number) | null = null;

  // The look's uniforms and the rooms it reflects, on a program in use that includes SHADING. The look itself is
  // sent only when it changes (look.ts applyLook) and the samplers' units once; the field's size, the clock, the
  // portrait's shape and every binding are set each frame.
  const shade = (program: WebGLProgram, look: Look) => {
    gl.uniform2f(location(program, "frame"), size.width, size.height);
    // What moves on its own in a material (surface.ts time) runs on the page's clock, kept small for float precision.
    gl.uniform1f(location(program, "time"), clock ? clock() : (performance.now() / 1000) % 3600);
    applyLook(gl, uniforms, program, look);
    assets.use(look);
    uniforms.samplers(program, SHADING_SAMPLERS);
    gl.uniform1f(location(program, "faceAspect"), assets.faceAspect());
    gl.uniform1f(location(program, "liveAspect"), assets.liveAspect());
    gl.activeTexture(gl.TEXTURE0 + UNIT.lastScene);
    gl.bindTexture(gl.TEXTURE_2D, last.texture);
  };

  const render: FoamRenderer["render"] = (bubbleCount, look = LOOK_DEFAULTS, from = 0) => {
    lastLook = look;
    // Only these bubbles, as if they were all there were.
    const bubbles = all.subarray(Math.min(from, bubbleCount) * BUBBLE_FLOATS);
    bubbleCount -= Math.min(from, bubbleCount);
    // The ground reacts (shade, colour) only when asked to; otherwise no halos are drawn.
    const groundHalo = look.edgeShadow > 0 || look.colourBleed > 0 ? 1 : 0;
    const count = Math.min(bubbleCount, MAX_BUBBLES);
    gl.bindBuffer(gl.ARRAY_BUFFER, bubbleBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, bubbles, 0, count * BUBBLE_FLOATS);
    // Per bubble, the bubbles it overlaps, most deeply pressed kept (neighbours.ts).
    const rows = Math.max(1, Math.ceil(count / ROW));
    const neighbourIds = neighboursOf(bubbles, count);
    gl.bindTexture(gl.TEXTURE_2D, bubbleData);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW, rows, gl.RGBA, gl.FLOAT, bubbles, 0);
    gl.bindTexture(gl.TEXTURE_2D, neighbourData);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ROW * NEIGHBOUR_TEXELS, rows, gl.RGBA, gl.FLOAT, neighbourIds, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(splatProgram);
    gl.uniform2f(location(splatProgram, "frame"), size.width, size.height);
    gl.uniform1f(location(splatProgram, "groundHalo"), groundHalo);
    uniforms.samplers(splatProgram, SPLAT_SAMPLERS);
    for (let peel = 0; peel < 2; peel += 1) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, layers[peel]!.target);
      gl.viewport(0, 0, sim.width, sim.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (count === 0) continue;
      gl.uniform1i(location(splatProgram, "second"), peel);
      gl.activeTexture(gl.TEXTURE0 + UNIT.first);
      gl.bindTexture(gl.TEXTURE_2D, peel === 1 ? layers[0].texture : null);
      gl.bindVertexArray(bubbleMesh);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.disable(gl.DEPTH_TEST);

    // The ground round the spheres: colours add, shade and nearness keep the largest. Read by the composite only
    // while the ground reacts (programs/sphere.ts: groundHalo > 0.5), so left as it was otherwise.
    if (groundHalo > 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.target);
      gl.viewport(0, 0, sim.width, sim.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (count > 0) {
        gl.useProgram(shadowProgram);
        gl.uniform2f(location(shadowProgram, "frame"), size.width, size.height);
        gl.uniform1f(location(shadowProgram, "groundHalo"), groundHalo);
        // keyScreen and the coat (COAT's uniforms: the only ones of a look this program has).
        applyLook(gl, uniforms, shadowProgram, look);
        gl.enable(gl.BLEND);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindVertexArray(bubbleMesh);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
        gl.disable(gl.BLEND);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.full);
    gl.viewport(0, 0, size.pixelWidth, size.pixelHeight);
    // The spheres' heights go to the frame's depth (ALWAYS: every pixel is written once).
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.clearDepth(1);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(sphereProgram);
    gl.activeTexture(gl.TEXTURE0 + UNIT.first);
    gl.bindTexture(gl.TEXTURE_2D, layers[0].texture);
    gl.activeTexture(gl.TEXTURE0 + UNIT.second);
    gl.bindTexture(gl.TEXTURE_2D, layers[1].texture);
    uniforms.samplers(sphereProgram, SPHERE_SAMPLERS);
    gl.uniform1f(location(sphereProgram, "cssPerPixel"), size.width / size.pixelWidth);
    gl.uniform1f(location(sphereProgram, "groundHalo"), groundHalo);
    shade(sphereProgram, look);
    gl.activeTexture(gl.TEXTURE0 + UNIT.bubbleData);
    gl.bindTexture(gl.TEXTURE_2D, bubbleData);
    gl.activeTexture(gl.TEXTURE0 + UNIT.neighbours);
    gl.bindTexture(gl.TEXTURE_2D, neighbourData);
    gl.activeTexture(gl.TEXTURE0 + UNIT.shadowField);
    gl.bindTexture(gl.TEXTURE_2D, shadow.field);
    gl.activeTexture(gl.TEXTURE0 + UNIT.shadowTint);
    gl.bindTexture(gl.TEXTURE_2D, shadow.tint);
    gl.bindVertexArray(screen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.DEPTH_TEST);
    // No winners yet (targets): whatever is drawn next writes its own.
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.heights);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  // Whether a material mirrors its neighbours (surface.ts mirrorOf): asked of its GLSL once per material.
  const mirroring = new Map<number, boolean>();
  const mirrors = (material: number) => {
    let known = mirroring.get(material);
    if (known === undefined) mirroring.set(material, (known = materialOf(material)?.glsl.includes("mirrorOf(") ?? false));
    return known;
  };

  const present: FoamRenderer["present"] = (look = lastLook) => {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.colorMask(true, true, true, true);
    gl.bindVertexArray(screen);
    gl.activeTexture(gl.TEXTURE0 + UNIT.sceneColour);
    gl.bindTexture(gl.TEXTURE_2D, scene.colour);
    gl.activeTexture(gl.TEXTURE0 + UNIT.sceneDepth);
    gl.bindTexture(gl.TEXTURE_2D, scene.depth);
    // Kept for the next frame, its blur in its mips.
    gl.bindFramebuffer(gl.FRAMEBUFFER, last.target);
    gl.viewport(0, 0, last.width, last.height);
    gl.useProgram(keepProgram);
    uniforms.samplers(keepProgram, SCENE_SAMPLERS);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // Its mips are read only by a material that mirrors its neighbours (surface.ts mirrorOf), while 이웃 반사 is up.
    if (floatLinear && look.neighbourReflection > 0 && mirrors(look.material)) {
      gl.activeTexture(gl.TEXTURE0 + UNIT.lastScene);
      gl.bindTexture(gl.TEXTURE_2D, last.texture);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    // Onto the canvas.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, size.pixelWidth, size.pixelHeight);
    gl.useProgram(presentProgram);
    uniforms.samplers(presentProgram, SCENE_SAMPLERS);
    const cssPerPixel = size.width / size.pixelWidth;
    gl.uniform1f(location(presentProgram, "cssPerPixel"), cssPerPixel);
    // 맞닿은 틈 0: no join; otherwise 0.6–2 CSS px either side of it.
    gl.uniform1f(location(presentProgram, "reach"), look.crease > 0 ? (0.6 + 1.4 * look.crease) / cssPerPixel : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  const pixel = new Uint8Array(4);
  const sync: FoamRenderer["sync"] = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  };

  const dispose = () => {
    assets.dispose();
    gl.deleteTexture(bubbleData);
    gl.deleteTexture(neighbourData);
    for (const layer of layers) {
      gl.deleteTexture(layer.texture);
      gl.deleteFramebuffer(layer.target);
    }
    gl.deleteTexture(shadow.field);
    gl.deleteTexture(shadow.tint);
    gl.deleteFramebuffer(shadow.target);
    for (const texture of [scene.colour, scene.depth, scene.winners, last.texture]) gl.deleteTexture(texture);
    for (const target of [scene.full, scene.shaded, scene.heights, last.target]) gl.deleteFramebuffer(target);
    gl.deleteRenderbuffer(depth);
    for (const buffer of [square, bubbleBuffer]) gl.deleteBuffer(buffer);
    for (const vao of [screen, bubbleMesh]) gl.deleteVertexArray(vao);
    gl.deleteProgram(splatProgram);
    gl.deleteProgram(shadowProgram);
    gl.deleteProgram(sphereProgram);
    gl.deleteProgram(keepProgram);
    gl.deleteProgram(presentProgram);
  };

  return {
    bubbles: all,
    resize,
    render,
    gl,
    program: (vertex, fragment) => compile(gl, vertex, fragment),
    shade: (program) => shade(program, lastLook),
    material: () => lastLook.material,
    size: () => size,
    targets: () => targets,
    present,
    loaded: assets.loaded,
    setClock: (next) => {
      clock = next;
    },
    sync,
    dispose,
  };
}
