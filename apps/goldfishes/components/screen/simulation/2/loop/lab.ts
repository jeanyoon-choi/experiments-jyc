// 랩: one object on its own, the raft and the school paused. The morph under way and where its sequence is.

import { OBJECT_KINDS, type ObjectParameters } from "../objects/kinds/parameters"; // 오브제
import type { LabSettings } from "../objects/morph/lab"; // 랩
import { FIELD_KINDS, layerOf, nextInSequence, retarget, type Morph } from "../objects/morph/morph"; // 랩
import type { ObjectPass } from "../objects/object-pass";
import type { FoamRenderer } from "../render/foam";
import type { Look } from "../render/shading";

export class Lab {
  /** Its morph, the last target and step asked for, and where its sequence is. */
  private readonly morph: Morph = { from: layerOf("heart"), to: layerOf("heart"), start: -Infinity };
  private asked = { pick: 0, step: 0 };
  private readonly visited = { last: -1 };

  /** The background, and one object on its morph in the middle; `announce`: the morph under way, when it changes. */
  draw(
    settings: { lab: LabSettings; objects: ObjectParameters },
    time: number,
    field: { width: number; height: number },
    renderer: Pick<FoamRenderer, "render" | "present">,
    objectPass: Pick<ObjectPass, "drawLab">,
    look: Look,
    announce?: (from: string, to: string) => void,
  ) {
    const lab = settings.lab;
    const morph = this.morph;
    const liquid = settings.objects;
    const kinds = OBJECT_KINDS.filter((kind) => settings.objects[`${kind}On`] >= 0.5 || lab.all >= 0.5);
    const tell = () => announce?.(FIELD_KINDS[morph.from]!, FIELD_KINDS[morph.to]!);
    if (lab.pick !== this.asked.pick || lab.step !== this.asked.step) {
      // A chip pressed (or the canvas tapped): flow into it, or on to the next in the sequence.
      const target = lab.pick !== this.asked.pick ? layerOf(lab.target as (typeof FIELD_KINDS)[number]) : layerOf(nextInSequence(lab.sequence, FIELD_KINDS[morph.to]!, kinds, this.visited));
      this.asked = { pick: lab.pick, step: lab.step };
      if (target >= 0) retarget(morph, target, time, liquid);
      tell();
    } else if (lab.auto >= 0.5 && lab.scrub < 0 && time - morph.start >= liquid.duration + lab.hold) {
      retarget(morph, layerOf(nextInSequence(lab.sequence, FIELD_KINDS[morph.to]!, kinds, this.visited)), time, liquid);
      tell();
    }
    renderer.render(0, look);
    objectPass.drawLab(
      {
        x: field.width / 2,
        y: field.height / 2,
        radius: Math.min(field.width, field.height) * 0.3 * lab.scale,
        turn: lab.turn,
        morph,
        time,
        scrub: lab.scrub >= 0 ? lab.scrub : null,
      },
      settings.objects,
    );
    renderer.present();
  }
}
