// The agents' signs as the body shows them: a keyword is an object (its kind picked by the keyword's key among the
// groups 오브제 has on, or the field layer a stroke was given), a shape of it is the coat its seed picks in the look
// in use. Nothing here is a rule: the model (model/agents.ts) knows keywords and signs only as numbers.

import type { AgentWorld } from "../model/agents.ts";
import { layerOf } from "../objects/kinds/layers.ts";
import { pageKind, type ObjectParameters } from "../objects/kinds/parameters.ts";

export class SignKinds {
  /** Per bubble: the field layer it is shown as (0: a bubble). The object pass and the feed read it as 전파's kinds. */
  readonly kinds = new Int16Array(4096);
  /** Per keyword: its layer under `objects`, worked out once (a key's kind changes only with the groups that are on). */
  private layerOfKeyword: number[] = [];
  private objects: ObjectParameters | null = null;
  private state: unknown = null;

  private layer(agents: AgentWorld, keyword: number, objects: ObjectParameters) {
    const word = agents.keywords[keyword]!;
    return word.layer >= 0 ? word.layer : Math.max(0, layerOf(pageKind(word.key, objects)));
  }

  /** Every bubble's layer this frame. */
  resolve(agents: AgentWorld, objects: ObjectParameters) {
    if (this.objects !== objects || this.state !== agents.state) {
      this.objects = objects;
      this.state = agents.state;
      this.layerOfKeyword = [];
    }
    const known = this.layerOfKeyword;
    for (let keyword = known.length; keyword < agents.keywords.length; keyword += 1) known[keyword] = this.layer(agents, keyword, objects);
    const size = agents.state.size;
    for (let bubble = 0; bubble < size; bubble += 1) this.kinds[bubble] = known[agents.keywordOf(bubble)]!;
    return this.kinds;
  }

  /**
   * A key for a stroke's new keyword whose object is not on the screen now, if one is found in a few tries (with
   * few kinds on, every one may be). Keys of strokes are above 10,000 so none meets an opening keyword's.
   */
  freshKey(agents: AgentWorld, objects: ObjectParameters) {
    const shown = new Set<number>();
    const size = agents.state.size;
    for (let bubble = 0; bubble < size; bubble += 1) shown.add(this.kinds[bubble]!);
    const base = 10_000 + agents.keywords.length * 7.31;
    for (let tries = 0; tries < 48; tries += 1) {
      const key = base + tries * 0.618;
      if (!shown.has(Math.max(0, layerOf(pageKind(key, objects))))) return key;
    }
    return base;
  }
}
