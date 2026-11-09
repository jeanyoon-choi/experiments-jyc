// Shared shapes for rooms, people and lines.

export type Side = "left" | "right";
export const SIDES: readonly Side[] = ["left", "right"];
export const other = (side: Side): Side => (side === "left" ? "right" : "left");

/**
 * How a person types: elder (60–70대: 띄어쓰기, ~~, !!, 이모지, 지라시),
 * parent (50대), young (2030 커뮤 말투), office (존댓말, 회사), anon (오픈채팅 닉네임).
 */
export type Voice = "elder" | "parent" | "young" | "office" | "anon";
export const VOICES: readonly Voice[] = ["elder", "parent", "young", "office", "anon"];

export type Member = {
  id: string;
  name: string;
  avatar: number | null;
  /** −2 strong left … 0 none … +2 strong right. */
  lean: number;
  voice: Voice;
};

export type Room = {
  id: string;
  name: string;
  kind: "dm" | "group";
  /** Open chats show joins and kicks instead of invitations. */
  open?: boolean;
  members: readonly Member[];
  /** Shown member count for groups (more than the speaking members). */
  size?: number;
  /** Everyday messages per minute while the phone is level. */
  base: number;
  /** How readily the room turns political (0–1). */
  politics: number;
  /** Small talk while the phone is level. */
  idle: readonly string[];
  muted?: boolean;
  pinned?: boolean;
  work?: boolean;
  /**
   * Opening lines played when the room first appears: [member index, text, _].
   * Index −1 (the participant) is skipped; the third value is unused history.
   */
  seed: readonly (readonly [number, string, number])[];
};

/** Three intensities: 온건 → 강경 → 극단. */
export type Tiers<T> = readonly [readonly T[], readonly T[], readonly T[]];

/**
 * One beat of a scripted exchange. Roles bind to members present in the room:
 * A and B speak for the side the phone leans to, O for the other side,
 * N for the people who want none of it. {A} {B} {O} {N} insert their names.
 */
export type Beat = readonly [role: "A" | "B" | "O" | "N", text: string];
export type Thread = readonly Beat[];
