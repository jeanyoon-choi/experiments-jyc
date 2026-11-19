// The objects drawn on the raft's canvas, after the raft, in its material:
// the fragment shader is the spheres' (render/shading.ts SHADING) — coat,
// metal, clear coat, the photographed room, the key, the ground below the
// horizon, each page's own turn and hue — with the object's own normal in
// place of the sphere's. Each object mirrors its nearest neighbours as the
// spheres do (raft 이웃 반사): without them it showed only the room, a lone
// highlight on an empty coat, and read cheap (user: "너무 싼티남"). The
// neighbours are mirrored as the spheres they are (bubbles, ontologically),
// up to four, found here on the CPU. Not carried over: the spheres' seams.
//
// bubble/7 (액체 모핑, user 2026-10-27): no meshes. Every object is a field
// (fields.ts) in one texture array, the bubble its first layer, and every
// object one square in one instanced draw. Per pixel the shader reads two
// kinds' fields and blends them as liquid (morph.ts): the outline flows from
// one to the other, the surface softens into a drop held by surface tension,
// wobbles and ripples, and sets again into the next object's own surface. The
// height it finds is written as depth, as the meshes' was.
//
// 2026-11-17: drawn twice into the raft's frame (foam.ts targets): first its heights alone, then its material, only
// where it is the nearest surface — large objects lie many deep, and every layer under the top one was shaded and
// thrown away. 2026-11-18: the first pass also writes which object won each pixel, and the second reads that before
// anything else, so a covered object's pixels cost one texel there (they read their fields a second time only to
// find themselves covered: 8 ms of a 22 ms frame with large objects). In its material an object sees the bodies round it in the last frame (materials/surface.ts): it
// mirrors them (이웃 반사) and is joined to those it stands in (맞닿은 틈).
//
// Pages morph when what they are shown as changes (변신, the set's chips);
// portions under way flow from their own object into the page they reach;
// the 랩 draws one object, large, on its own morph.
//
// bubble/9 (기호의 파티, 2026-11-05): with the catalogue's hundreds of kinds the fields are kept in tiers (tiers.ts):
// every kind at 64², and pools of 128², 256² and 512² slots for the kinds whose objects on screen are largest, so
// GPU memory is fixed whatever the catalogue's size. An instance carries, for the two kinds it flows between, the
// address of each one's finest tier (tier × 4096 + slot); the shader reads that tier at the mip it would have read
// of the full field, so a kind looks the same from any tier fine enough for its size. Bakes run on demand in the
// workers, the largest objects' kinds first.
//
// 2026-11-18: this file only composes the pass; each of its jobs is a module of its own —
//   pass/shader.ts          the two shaders,
//   pass/instances.ts       what one object carries to them, the buffer and the square,
//   pass/neighbours.ts      each bubble's nearest neighbours,
//   pass/page-morphs.ts     each page's morph,
//   pass/turns.ts           how each object is turned,
//   pass/tint.ts            전파's tint and the logos' brand colours,
//   fields/field-textures.ts the fields on the GPU,
//   fields/bake-queue.ts    the workers and what they bake next.
// It alone knows the raft's renderer (render/foam.ts).

import { BUBBLE_FLOATS as FOAM_BUBBLE_FLOATS, type FoamRenderer } from "../render/foam";
import { createBakeQueue } from "./fields/bake-queue";
import { createFieldTextures } from "./fields/field-textures";
import { FIELD_EXTENT } from "./fields/frame";
import { poolsFor, Residency } from "./fields/tiers";
import { FIELD_KINDS, layerOf } from "./kinds/layers";
import { pageKind, pagesAreObjects, portionKind, type ObjectKind, type ObjectParameters } from "./kinds/parameters";
import { styleOf } from "./morph/liquid";
import { envelopeInto, motionInto, passageInto, type Morph } from "./morph/morph";
import { clearNeighbours, createInstances, INSTANCE_FLOATS, placeBubble, placeNeighbours, TINT, writeInstance } from "./pass/instances";
import { BUBBLE_FLOATS, createNeighbours } from "./pass/neighbours";
import { createPageMorphs, MAX_TRACKED } from "./pass/page-morphs";
import { FRAGMENT, VERTEX } from "./pass/shader";
import { createTint } from "./pass/tint";
import { createTurns } from "./pass/turns";

/** The texture unit the first pass's winners are read from while shading (8–19 the fields' and 인쇄물's, 20 the last frame). */
const DEPTH_UNIT = 22;
const LAYERS = FIELD_KINDS.length;

/** Per page or portion, what the frame loop knows beyond its bubble (전파 and the portions' targets). */
export type ObjectFrame = {
  /** Seconds, for the liquid's sway. */
  time: number;
  /** Per page: how many times it has moved on to another object (simulation/attention.ts turns). */
  turns: Uint32Array;
  /** A portion's target page (−1 for pages). */
  targetOf: Int32Array;
  /** A portion's share of its way, 0–1. */
  travelOf: Float32Array;
  /** Per page: tint rgb and amount (전파), or null. */
  tints: Float32Array | null;
  /** Per page: the kind 전파 has given it (a field layer), or −1 (its own). */
  caught: Int16Array | null;
};

/** The 랩's one object: where, how large, which morph and how far along it (null: by the clock). */
export type LabFrame = { x: number; y: number; radius: number; turn: number; morph: Morph; time: number; scrub: number | null };

export type ObjectPass = {
  /**
   * Draws the frame's `count` bubbles that are shown as objects: the portions
   * before `pageStart` (each from its page, `pageOf`), then the pages;
   * `headingOf` is each one's direction of travel (각도 · 움직이는 방향).
   */
  draw(pageStart: number, count: number, pageOf: Int32Array, headingOf: Float32Array, parameters: ObjectParameters, frame: ObjectFrame): void;
  /** Whether a page's morph has set by `time` (or it has none): only then does it move on again. */
  settled(page: number, time: number, duration: number): boolean;
  /** Draws the 랩's object alone. */
  drawLab(lab: LabFrame, parameters: ObjectParameters): void;
  /**
   * Whether no bake is under way (loop/replay.ts `?replay`): every worker is back, so whatever could be baked under
   * the last plan has been (a kind its pool has no room for waits for the next plan, and would never be "done").
   */
  idle(): boolean;
  /** Whether a layer's field is ready. */
  ready(layer: number): boolean;
  /**
   * Per page, last frame: how far its drawn object reaches, as a share of its
   * disc (size × its outline; 1 while it is the raft's sphere). The goldfish
   * keep out of that disc, not the bare bubble's.
   */
  pageExtent: Float32Array;
  dispose(): void;
};

export function createObjectPass(foam: FoamRenderer, maxBubbles: number): ObjectPass {
  // The pass lays a bubble out by its own count (pass/neighbours.ts): the raft's, or nothing here holds.
  if (FOAM_BUBBLE_FLOATS !== BUBBLE_FLOATS) throw new Error("object pass: a bubble's floats are not the raft's");
  const gl = foam.gl;
  const program = foam.program(VERTEX, FRAGMENT);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const at = {
    size: uniform("size"),
    puff: uniform("puff"),
    time: uniform("time"),
    cssPerPixel: uniform("cssPerPixel"),
    soften: uniform("soften"),
    wobble: uniform("wobble"),
    ripple: uniform("ripple"),
    swell: uniform("swell"),
    mercury: uniform("mercury"),
    residue: uniform("residue"),
    faceColour: uniform("faceColour"),
    brand: uniform("brand"),
    shading: uniform("shading"),
  };
  // Stands in for the winners while they are being written (a texture may not be read where it is drawn to).
  const noDepth = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, noDepth);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // The tiers (tiers.ts): every kind's 64² layer, and the pools' slots, sized at the start from one budget.
  const residency = new Residency(LAYERS, poolsFor(LAYERS));
  const fields = createFieldTextures(gl, residency);
  const bakes = createBakeQueue(residency, fields.takeIn);
  const instances = createInstances(gl, maxBubbles);
  const data = instances.data;
  const neighbours = createNeighbours(maxBubbles);
  const morphs = createPageMorphs(MAX_TRACKED);
  const turns = createTurns(MAX_TRACKED);
  const tint = createTint();
  const pageExtent = new Float32Array(MAX_TRACKED).fill(1);
  let lastTime = 0;

  // The samplers never change: named once here, not every frame (the program in use before is put back).
  {
    const inUse = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    gl.useProgram(program);
    fields.link(program);
    gl.uniform1i(uniform("sceneWinner"), DEPTH_UNIT);
    gl.useProgram(inUse);
  }

  /** The room a set object needs for its style's floor sway (0 under 금붕어). */
  let floorSway = 0;
  /**
   * Writes one instance's morph, turn and tint (its bubble and neighbours are written first): 전파's tint when
   * the page has one, else its brand colour by `brand`, blended between the two layers it flows between.
   */
  const write = (slot: number, flowFrom: number, flowTo: number, shape: number, melt: number, sway: number, sheen: number, turn: number, tints: Float32Array | null, tintPage: number, brand: number, size: number) => {
    // Its size on screen, for the pools: the kinds it flows between want a tier as fine as that.
    const radius = data[slot * INSTANCE_FLOATS + 2]! * size;
    bakes.seen(flowFrom, radius);
    bakes.seen(flowTo, radius);
    const fromLayer = bakes.shown(flowFrom);
    const toLayer = bakes.shown(flowTo);
    // The square: both outlines, and room for the melt's sway and the spring's overshoot.
    const fromReach = fields.reach[fromLayer]!;
    const toReach = fields.reach[toLayer]!;
    // A style's melt floor alone only sways the outline, by at most about wobble × residue.
    const loose = melt > 0 || sway > 0 || shape < 0 || shape > 1 ? 0.22 + Math.max(0, shape - 1, -shape) * Math.abs(toReach - fromReach) : floorSway;
    const half = Math.min(FIELD_EXTENT, Math.max(fromReach, toReach) + loose);
    writeInstance(data, slot, turn, residency.address[fromLayer]!, residency.address[toLayer]!, shape, melt, half, fields.paintAddress(fromLayer), fields.paintAddress(toLayer), sway, sheen, residency.blurOf(fromLayer), residency.blurOf(toLayer));
    tint.write(data, slot * INSTANCE_FLOATS + TINT, tints, tintPage, fromLayer, toLayer, shape, brand);
  };

  /** The frame's start: the pools' clock, the style's floor sway. */
  const open = (parameters: ObjectParameters, time: number) => {
    residency.clock = time;
    const residue = styleOf(parameters).residue;
    floorSway = residue > 0 ? parameters.wobble * residue * 1.1 + 0.01 : 0;
  };
  const begin = (parameters: ObjectParameters, time: number, size: { width: number; pixelWidth: number; pixelHeight: number }) => {
    gl.viewport(0, 0, size.pixelWidth, size.pixelHeight);
    gl.useProgram(program);
    foam.shade(program);
    gl.uniform1f(at.size, parameters.size);
    gl.uniform1f(at.puff, parameters.puff);
    gl.uniform1f(at.time, time);
    gl.uniform1f(at.cssPerPixel, size.width / Math.max(1, size.pixelWidth));
    gl.uniform1f(at.soften, parameters.soften);
    gl.uniform1f(at.wobble, parameters.wobble);
    gl.uniform1f(at.ripple, parameters.ripple);
    gl.uniform1f(at.swell, parameters.swell);
    gl.uniform1f(at.mercury, parameters.mercury);
    gl.uniform1f(at.residue, styleOf(parameters).residue);
    gl.uniform1f(at.faceColour, parameters.faceColour ?? 1);
    gl.uniform1f(at.brand, parameters.brand);
    // Units 8–18 (WebGL2 has at least 32; the raft's own programs use 0–7).
    fields.bind();
  };
  const finish = (count: number) => {
    instances.bind(count);
    const targets = foam.targets();
    gl.activeTexture(gl.TEXTURE0 + DEPTH_UNIT);
    // Heights first, in depth with the spheres just drawn (the portions under way): each passes behind the other
    // where it is lower, and the one left on top of a pixel is written there as its winner.
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.heights);
    gl.bindTexture(gl.TEXTURE_2D, noDepth);
    gl.uniform1f(at.shading, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.disable(gl.DEPTH_TEST);
    // Then the material, of the winner alone.
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.colour);
    gl.bindTexture(gl.TEXTURE_2D, targets.winners);
    gl.uniform1f(at.shading, 1);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
  };

  // What the frame being drawn reads its pages by, and what it answers into: kept here so that nothing (a closure,
  // an answer) is made per frame or per object.
  let drawing: ObjectParameters | null = null;
  let caught: Int16Array | null = null;
  let pageTurns: Uint32Array | null = null;
  const flow = { from: 0, to: 0, shape: 0, melt: 0 };
  const set = { shape: 0, melt: 0 };
  const moved = { sway: 0, sheen: 0 };
  /** The layer a page should be now: its 전파 kind, or its own (변신 included). */
  const wantOf = (page: number) => {
    const kind: ObjectKind | null = caught && caught[page]! >= 0 ? (FIELD_KINDS[caught[page]!] as ObjectKind) : pageKind(page, drawing!, pageTurns![page]);
    return layerOf(kind);
  };
  /** The layer a page is shown as: where its morph is going, or what it should be if not tracked yet. */
  const shownAs = (page: number) => {
    const going = morphs.going(page);
    return going >= 0 ? going : wantOf(page);
  };

  const draw: ObjectPass["draw"] = (pageStartIndex, count, pageOf, headingOf, parameters, frame) => {
    const time = frame.time;
    open(parameters, time);
    drawing = parameters;
    caught = frame.caught;
    pageTurns = frame.turns;
    const facing = Math.round(parameters.facing);
    const bubbles = foam.bubbles;
    const portionMorph = parameters.portionMorph >= 0.5;
    const pageObjects = pagesAreObjects(parameters);
    const dt = Math.min(0.1, Math.max(0, time - lastTime));
    lastTime = time;
    const total = Math.min(count, maxBubbles);
    // Only the coat mirrors its neighbours as bubbles (pass/shader.ts: a material returns before that loop, and
    // mirrors what stands round it from the last frame instead): under a material they are neither found nor sent.
    const mirrored = foam.material() <= 0.5;
    if (mirrored) neighbours.find(bubbles, total, parameters.size);
    let drawn = 0;
    for (let index = 0; index < total; index += 1) {
      const page = pageOf[index]!;
      const seed = bubbles[index * BUBBLE_FLOATS + 3]!;
      let flowFrom: number;
      let flowTo: number;
      let shape: number;
      let melt: number;
      let sway: number;
      let sheen: number;
      if (index < pageStartIndex) {
        const target = frame.targetOf[index]!;
        if (portionMorph && target >= 0) {
          // Its source page's shape → its own (bubble, heart, tech, …) → the shape of the page it reaches.
          const own = layerOf(portionKind(page, seed, parameters));
          passageInto(flow, frame.travelOf[index]!, shownAs(page), own, shownAs(target), parameters);
          flowFrom = flow.from;
          flowTo = flow.to;
          shape = flow.shape;
          melt = flow.melt;
          sway = melt;
          sheen = melt;
          // All bubbles, end to end: the raft's own sphere.
          if (flowFrom === 0 && flowTo === 0 && !pageObjects) continue;
        } else {
          const kind = portionKind(page, seed, parameters);
          if (!kind) continue;
          flowFrom = flowTo = layerOf(kind);
          shape = 1;
          melt = 0;
          sway = 0;
          sheen = 0;
        }
      } else {
        const state: Morph = morphs.layer(page, wantOf(page), time, parameters);
        // While the pages are spheres, one that is a bubble and stays one is the raft's: not drawn here.
        const raft = !pageObjects && state.from === 0 && state.to === 0;
        if (page < MAX_TRACKED) pageExtent[page] = raft ? 1 : parameters.size * Math.max(fields.outline[state.from]!, fields.outline[state.to]!);
        if (raft) continue;
        flowFrom = state.from;
        flowTo = state.to;
        const u = (time - state.start) / parameters.duration;
        envelopeInto(set, u, parameters);
        shape = set.shape;
        melt = set.melt;
        motionInto(moved, u, melt, parameters);
        sway = moved.sway;
        sheen = moved.sheen;
      }
      placeBubble(data, drawn, bubbles, index);
      if (mirrored) placeNeighbours(data, drawn, bubbles, neighbours.ids, index);
      else clearNeighbours(data, drawn);
      let turn = turns.aim(facing, seed, headingOf[index]!, flowFrom, flowTo, shape);
      if (index >= pageStartIndex && page < MAX_TRACKED) turn = turns.spring(page, turn, dt);
      write(drawn, flowFrom, flowTo, shape, melt, sway, sheen, turn, frame.tints, page, parameters.brand, parameters.size);
      drawn += 1;
    }
    // Once a frame (it was asked again at every plan), and its answer made once.
    const size = foam.size();
    bakes.plan(time, parameters, size.width / Math.max(1, size.pixelWidth));
    if (drawn === 0) return;
    begin(parameters, time, size);
    finish(drawn);
  };

  const drawLab: ObjectPass["drawLab"] = (lab, parameters) => {
    open(parameters, lab.time);
    const u = lab.scrub ?? (lab.time - lab.morph.start) / parameters.duration;
    const { shape, melt } = envelopeInto(set, u, parameters);
    const { sway, sheen } = motionInto(moved, u, melt, parameters);
    data.fill(0, 0, INSTANCE_FLOATS);
    data[0] = lab.x;
    data[1] = lab.y;
    data[2] = lab.radius;
    data[3] = 0.37;
    write(0, lab.morph.from, lab.morph.to, shape, melt, sway, sheen, lab.turn, null, -1, parameters.brand, parameters.size);
    const size = foam.size();
    bakes.plan(lab.time, parameters, size.width / Math.max(1, size.pixelWidth));
    begin(parameters, lab.time, size);
    finish(1);
  };

  const dispose = () => {
    bakes.dispose();
    instances.dispose();
    fields.dispose();
    gl.deleteTexture(noDepth);
    gl.deleteProgram(program);
  };

  return { draw, drawLab, settled: morphs.settled, ready: (layer) => residency.baked[layer] === 1, idle: bakes.idle, pageExtent, dispose };
}
