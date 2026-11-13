import type {
  SocialStorySystem,
  StoryCellState,
  StoryInfluence,
  StoryNode,
  StoryTie,
} from "./types";

const DIRECT_TRANSMISSION_CHANCE = 0.985;
const MAX_VISIBLE_INFLUENCES = 120;
const VIEW_EVENT_RATE = 0.24;
const INFLUENCE_LIFETIME = 1200;
const VIEWING_TRANSITION_MILLISECONDS = 760;
const LEAVING_TRANSITION_MILLISECONDS = 300;
const EMPTY_COOLDOWN_MILLISECONDS = 1000;
const INITIAL_NEW_SHARE = 0.54;
const MAXIMUM_NEW_SHARE = 0.74;
const TRANSMISSIONS_PER_STORY = 2;
const MAX_PROPAGATIONS_PER_STEP_SHARE = 0.045;

const LOCAL_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

function nextRandom(seed: number) {
  const nextSeed = (seed * 1664525 + 1013904223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 0x1_0000_0000 };
}

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function indexAt(column: number, row: number, columns: number) {
  return row * columns + column;
}

function pointFor(index: number, columns: number) {
  return { column: index % columns, row: Math.floor(index / columns) };
}

function firstTransmissionAt(now: number, seed: number): { time: number; seed: number } {
  const random = nextRandom(seed);
  return {
    time: now + 180 + Math.round(random.value * 420),
    seed: random.seed,
  };
}

function nextTransmissionAt(now: number, seed: number): { time: number; seed: number } {
  const random = nextRandom(seed);
  return {
    time: now + 190 + Math.round(random.value * 310),
    seed: random.seed,
  };
}

function newStoryState(now: number, seed: number): { state: StoryCellState; seed: number } {
  const viewRandom = nextRandom(seed);
  const poissonDelay = -Math.log(Math.max(0.00001, 1 - viewRandom.value)) / VIEW_EVENT_RATE;
  const viewDelay = Math.round(Math.min(10000, Math.max(1400, poissonDelay * 1000)));
  const transmission = firstTransmissionAt(now, viewRandom.seed);

  return {
    seed: transmission.seed,
    state: {
      status: "new",
      viewAt: now + viewDelay,
      viewingUntil: null,
      leavingUntil: null,
      availableAt: now,
      transmitAt: transmission.time,
      transmissionsRemaining: TRANSMISSIONS_PER_STORY,
      transmittedAt: null,
    },
  };
}

function propagatedStoryState(now: number, seed: number): { state: StoryCellState; seed: number } {
  const transmission = firstTransmissionAt(now, seed);

  return {
    seed: transmission.seed,
    state: {
      status: "new",
      viewAt: now + INFLUENCE_LIFETIME,
      viewingUntil: null,
      leavingUntil: null,
      availableAt: now,
      transmitAt: transmission.time,
      transmissionsRemaining: TRANSMISSIONS_PER_STORY,
      transmittedAt: null,
    },
  };
}

function viewingStoryState(now: number): StoryCellState {
  return {
    status: "viewing",
    viewAt: null,
    viewingUntil: now + VIEWING_TRANSITION_MILLISECONDS,
    leavingUntil: null,
    availableAt: now,
    transmitAt: null,
    transmissionsRemaining: 0,
    transmittedAt: null,
  };
}

function leavingStoryState(now: number): StoryCellState {
  return {
    status: "leaving",
    viewAt: null,
    viewingUntil: null,
    leavingUntil: now + LEAVING_TRANSITION_MILLISECONDS,
    availableAt: now,
    transmitAt: null,
    transmissionsRemaining: 0,
    transmittedAt: null,
  };
}

function emptyStoryState(availableAt = 0): StoryCellState {
  return {
    status: "empty",
    viewAt: null,
    viewingUntil: null,
    leavingUntil: null,
    availableAt,
    transmitAt: null,
    transmissionsRemaining: 0,
    transmittedAt: null,
  };
}

/** A local participant supplies a fresh occurrence of this keyword. */
export function activateStory(system: SocialStorySystem, index: number, now: number): SocialStorySystem {
  if (!system.nodes[index]) return system;
  const next = newStoryState(now, system.randomSeed);
  return { ...system, randomSeed: next.seed,
    states: system.states.map((state, i) => i === index ? next.state : state) };
}

function buildIncomingTies(columns: number, rows: number): readonly (readonly StoryTie[])[] {
  return Array.from({ length: columns * rows }, (_, target) => {
    const { column, row } = pointFor(target, columns);
    const tiesBySource = new Map<number, number>();

    for (const [columnOffset, rowOffset] of LOCAL_OFFSETS) {
      const sourceColumn = column + columnOffset;
      const sourceRow = row + rowOffset;
      if (
        sourceColumn < 0
        || sourceColumn >= columns
        || sourceRow < 0
        || sourceRow >= rows
      ) continue;
      const source = indexAt(sourceColumn, sourceRow, columns);
      const proximity = 1 / Math.max(1, Math.hypot(columnOffset, rowOffset));
      tiesBySource.set(source, 0.42 * proximity + unit(source * 23 + target * 17) * 0.2);
    }

    const socialAngle = unit(target * 31 + 7) * Math.PI * 2;
    const socialDistance = 2 + Math.floor(unit(target * 43 + 19) * 3);
    const socialColumn = column + Math.round(Math.cos(socialAngle) * socialDistance);
    const socialRow = row + Math.round(Math.sin(socialAngle) * socialDistance);
    if (
      socialColumn >= 0
      && socialColumn < columns
      && socialRow >= 0
      && socialRow < rows
      && (socialColumn !== column || socialRow !== row)
    ) {
      const source = indexAt(socialColumn, socialRow, columns);
      tiesBySource.set(source, Math.max(tiesBySource.get(source) ?? 0, 1.1 + unit(target * 67) * 0.35));
    }

    return [...tiesBySource.entries()].map(([source, weight]) => ({ source, target, weight }));
  });
}

function buildOutgoingTies(
  incomingTies: readonly (readonly StoryTie[])[],
  count: number,
): readonly (readonly StoryTie[])[] {
  const outgoingTies = Array.from({ length: count }, () => [] as StoryTie[]);
  for (const ties of incomingTies) {
    for (const tie of ties) outgoingTies[tie.source]!.push(tie);
  }
  return outgoingTies;
}

function chooseTie(
  ties: readonly StoryTie[],
  seed: number,
): { tie: StoryTie; seed: number } {
  const totalWeight = ties.reduce((total, tie) => total + tie.weight, 0);
  const random = nextRandom(seed);
  let threshold = random.value * totalWeight;

  for (const tie of ties) {
    threshold -= tie.weight;
    if (threshold <= 0) return { tie, seed: random.seed };
  }

  return { tie: ties[ties.length - 1]!, seed: random.seed };
}

function shuffleSources(sources: readonly number[], seed: number): { sources: number[]; seed: number } {
  const shuffled = [...sources];
  let nextSeed = seed;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const random = nextRandom(nextSeed);
    nextSeed = random.seed;
    const swapIndex = Math.floor(random.value * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return { sources: shuffled, seed: nextSeed };
}

export function createSocialStorySystem(
  columns: number,
  rows: number,
  now = 0,
): SocialStorySystem {
  const nodes: StoryNode[] = Array.from({ length: columns * rows }, (_, index) => ({
    id: `story-${index + 1}`,
    index,
  }));
  let randomSeed = 0x7d35a2c1;
  const states: StoryCellState[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const random = nextRandom(randomSeed);
    randomSeed = random.seed;
    if (random.value < INITIAL_NEW_SHARE) {
      const next = newStoryState(now, randomSeed);
      randomSeed = next.seed;
      states.push(next.state);
    } else {
      states.push(emptyStoryState());
    }
  }

  const chooseInitialEmptyCell = (): number | null => {
    const emptyCells = states.flatMap((state, index) => state.status === "empty" ? [index] : []);
    if (emptyCells.length === 0) return null;
    const random = nextRandom(randomSeed);
    randomSeed = random.seed;
    return emptyCells[Math.floor(random.value * emptyCells.length)]!;
  };
  const minimumNewStories = Math.max(1, Math.ceil(nodes.length * INITIAL_NEW_SHARE));
  let initialNewStories = states.filter((state) => state.status === "new").length;

  while (initialNewStories < minimumNewStories) {
    const target = chooseInitialEmptyCell();
    if (target === null) break;
    const next = newStoryState(now, randomSeed);
    randomSeed = next.seed;
    states[target] = next.state;
    initialNewStories += 1;
  }

  const incomingTies = buildIncomingTies(columns, rows);

  return {
    columns,
    rows,
    time: now,
    nodes,
    incomingTies,
    outgoingTies: buildOutgoingTies(incomingTies, nodes.length),
    states,
    influences: [],
    randomSeed,
  };
}

export function stepSocialStorySystem(
  system: SocialStorySystem,
  now: number,
): SocialStorySystem {
  if (now <= system.time) return system;

  let randomSeed = system.randomSeed;
  const resolvedStates = system.states.map((current) => {
    if (current.status === "new" && current.viewAt !== null && current.viewAt <= now) {
      return viewingStoryState(now);
    }
    if (current.status === "viewing" && current.viewingUntil !== null && current.viewingUntil <= now) {
      return leavingStoryState(now);
    }
    if (current.status === "leaving" && current.leavingUntil !== null && current.leavingUntil <= now) {
      return emptyStoryState(now + EMPTY_COOLDOWN_MILLISECONDS);
    }
    return current;
  });

  const activeSources = new Set<number>();
  for (const node of system.nodes) {
    if (resolvedStates[node.index]?.status === "new") activeSources.add(node.index);
  }

  const nextStates = [...resolvedStates];
  const nextInfluences: StoryInfluence[] = system.influences.filter((edge) => edge.expiresAt > now);
  let newCount = activeSources.size;
  const maximumNewStories = Math.ceil(system.nodes.length * MAXIMUM_NEW_SHARE);
  const propagationLimit = Math.max(1, Math.ceil(system.nodes.length * MAX_PROPAGATIONS_PER_STEP_SHARE));
  const shuffled = shuffleSources([...activeSources], randomSeed);
  randomSeed = shuffled.seed;
  let propagations = 0;

  for (const source of shuffled.sources) {
    if (newCount >= maximumNewStories || propagations >= propagationLimit) break;
    const sourceState = nextStates[source];
    if (
      !sourceState
      || sourceState.transmissionsRemaining <= 0
      || sourceState.transmitAt === null
      || sourceState.transmitAt > now
    ) continue;
    const availableTies = system.outgoingTies[source]!.filter((tie) => {
      const targetState = nextStates[tie.target];
      return targetState?.status === "empty" && targetState.availableAt <= now;
    });
    if (availableTies.length === 0) {
      const retry = nextTransmissionAt(now, randomSeed);
      randomSeed = retry.seed;
      nextStates[source] = { ...sourceState, transmitAt: retry.time };
      continue;
    }
    const attempt = nextRandom(randomSeed);
    randomSeed = attempt.seed;
    const transmissionsRemaining = sourceState.transmissionsRemaining - 1;
    const followingTransmission = transmissionsRemaining > 0
      ? nextTransmissionAt(now, randomSeed)
      : null;
    if (followingTransmission) randomSeed = followingTransmission.seed;
    const sourceAfterAttempt: StoryCellState = {
      ...sourceState,
      transmitAt: followingTransmission?.time ?? null,
      transmissionsRemaining,
      transmittedAt: now,
    };
    nextStates[source] = sourceAfterAttempt;
    if (attempt.value >= DIRECT_TRANSMISSION_CHANCE) continue;

    const selected = chooseTie(availableTies, randomSeed);
    randomSeed = selected.seed;
    const propagated = propagatedStoryState(now, randomSeed);
    randomSeed = propagated.seed;
    nextStates[selected.tie.target] = propagated.state;
    newCount += 1;
    propagations += 1;
    nextInfluences.push({
      id: `${source}-${selected.tie.target}-${now}-${randomSeed}`,
      source,
      target: selected.tie.target,
      createdAt: now,
      expiresAt: now + INFLUENCE_LIFETIME,
    });
  }

  return {
    ...system,
    time: now,
    states: nextStates,
    influences: nextInfluences.slice(-MAX_VISIBLE_INFLUENCES),
    randomSeed,
  };
}
