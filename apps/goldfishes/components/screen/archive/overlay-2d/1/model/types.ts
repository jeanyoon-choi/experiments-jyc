export type StoryStatus = "empty" | "new" | "viewing" | "leaving";

export type StoryNode = Readonly<{
  id: string;
  index: number;
}>;

export type StoryCellState = Readonly<{
  status: StoryStatus;
  viewAt: number | null;
  viewingUntil: number | null;
  leavingUntil: number | null;
  availableAt: number;
  transmitAt: number | null;
  transmissionsRemaining: number;
  transmittedAt: number | null;
}>;

export type StoryTie = Readonly<{
  source: number;
  target: number;
  weight: number;
}>;

export type StoryInfluence = Readonly<{
  id: string;
  source: number;
  target: number;
  createdAt: number;
  expiresAt: number;
}>;

export type SocialStorySystem = Readonly<{
  columns: number;
  rows: number;
  time: number;
  nodes: readonly StoryNode[];
  incomingTies: readonly (readonly StoryTie[])[];
  outgoingTies: readonly (readonly StoryTie[])[];
  states: readonly StoryCellState[];
  influences: readonly StoryInfluence[];
  randomSeed: number;
}>;
