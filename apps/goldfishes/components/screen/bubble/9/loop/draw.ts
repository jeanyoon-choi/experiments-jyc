// The frame's drawing: which bubbles are the foam's spheres and which the object pass's, then the foam, the objects
// over it in its material, and the frame presented.

import { pagesAreObjects, PORTION_SHOWS, type ObjectParameters } from "../objects/kinds/parameters"; // 오브제
import type { ObjectFrame, ObjectPass } from "../objects/object-pass"; // 오브제
import type { FoamRenderer } from "../render/foam";
import type { Look } from "../render/shading";

/** The frame's bubbles beyond their discs, as simulation/emitter.ts keeps them. */
type Emitted = { readonly count: number; readonly pageStart: number; readonly pageOf: Int32Array; readonly headingOf: Float32Array; readonly targetOf: Int32Array; readonly travelOf: Float32Array };
/** 전파's tints and kinds per page (loop/spread.ts). */
type Strains = { readonly tints: Float32Array; readonly caught: Int16Array };

export class Drawing {
  /** Per page, how far last frame's object reached past its disc (ObjectPass.pageExtent); null while none was drawn. */
  pageExtent: Float32Array | null = null;
  /** 오브제: the frame handed to the object pass, filled in place each frame. */
  private readonly objectFrame: ObjectFrame;
  private readonly renderer: FoamRenderer;
  private readonly objectPass: ObjectPass;
  private readonly emitted: Emitted;

  /** `turns`: per page, how many times it has moved on to another object (simulation/attention.ts). */
  constructor(renderer: FoamRenderer, objectPass: ObjectPass, emitted: Emitted, turns: Uint32Array) {
    this.renderer = renderer;
    this.objectPass = objectPass;
    this.emitted = emitted;
    this.objectFrame = { time: 0, turns, targetOf: emitted.targetOf, travelOf: emitted.travelOf, tints: null, caught: null };
  }

  /**
   * 오브제: the pages, the portions under way, both or neither drawn as objects instead of spheres; the spheres left
   * are drawn as before. `objects`: the settings drawn with (under 전파, its own unit for the pages); `portions`: the
   * object panel's 흐름 버블 settings; `strains`: 전파's, or null outside it.
   */
  draw(objects: ObjectParameters, portions: Pick<ObjectParameters, "portions" | "portionMorph">, strains: Strains | null, look: Look, time: number) {
    const { renderer, objectPass, emitted } = this;
    const pageStart = emitted.pageStart;
    const spreading = strains !== null;
    // Under 전파 the pages are drawn as objects (only objects take a strain's colour).
    // Under 전파 the pages are its own unit (SNS by default), whatever the object panel shows them as.
    const pageObjects = pagesAreObjects(objects) || spreading;
    const portionShow = PORTION_SHOWS[Math.round(portions.portions)] ?? "bubble";
    // Morphing at both ends, the portions are the object pass's whenever the pages are objects.
    const portionObjects = (portionShow !== "bubble" && (portionShow !== "page" || pageObjects)) || (portions.portionMorph >= 0.5 && pageObjects);
    if (pageObjects && portionObjects) renderer.render(0, look);
    else if (pageObjects) renderer.render(pageStart, look);
    else if (portionObjects) renderer.render(emitted.count, look, pageStart);
    else renderer.render(emitted.count, look);
    this.pageExtent = pageObjects || portionObjects ? objectPass.pageExtent : null;
    if (pageObjects || portionObjects) {
      const frame = this.objectFrame;
      frame.time = time;
      frame.tints = strains ? strains.tints : null;
      frame.caught = strains ? strains.caught : null;
      objectPass.draw(pageStart, emitted.count, emitted.pageOf, emitted.headingOf, objects, frame);
    }
    renderer.present(look);
  }
}
