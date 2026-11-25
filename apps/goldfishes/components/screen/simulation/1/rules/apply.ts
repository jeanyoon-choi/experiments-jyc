// The one place where the answers in use (versions.ts) are handed to the raft: called once a frame by the loop.

import type { Raft } from "../raft/raft.ts";
import type { Held } from "./scale.ts";
import { SUPPLY } from "./supply.ts";
import type { Choices } from "./versions.ts";

export type Answers = Choices & { strokeSize: number; strokeQuality: number; grow: number };

export function applyRules(raft: Raft, answers: Answers, held: Held) {
  const local = raft.local;
  local.contacts = answers.contacts >= 0.5;
  local.visible = answers.visible >= 0.5;
  local.supply = SUPPLY[Math.round(answers.spread)] ?? "everywhere";
  local.noDrift = answers.noDrift >= 0.5;
  local.noArrivals = answers.noArrivals >= 0.5;
  raft.appealCrosses = answers.adopt >= 1.5;
  raft.strokeSize = answers.strokeSize;
  raft.strokeQuality = answers.strokeQuality;
  // The goldfish at each bubble (supply.ts `watched`), and the raft in fish's worths when its size is theirs.
  raft.watched = held.watched;
  raft.looking = held.looking;
  const sized = answers.scale >= 0.5;
  held.grow = answers.grow;
  // What the strokes laid since the last frame (raft.lay): each bubble its own fish's worth.
  if (raft.laid > 0) {
    if (sized) held.lay(raft.laid);
    raft.laid = 0;
  }
  raft.body = sized ? held.units : 0;
  // Another answer to how large the raft is starts the screen over: a raft changing size at once would crush the school.
  if (sized !== raft.sized) {
    raft.sized = sized;
    raft.requestRestart(raft.world.state.size);
  }
}
