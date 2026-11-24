// The Goldfishes system map: what the parts are, how the devices relate, what
// is built and what is still a question. This folder is the one place it is
// written; the /system page draws it and every agent reads it.
// How to change it: ../../../docs/system.md

/**
 * Who a sentence comes from.
 * own: the artist's own text (a note's 핵심 정리, a proposal, a decision in chat).
 * transcribed: an AI's reading of the artist's handwriting. Unreliable.
 * agent: an agent's reading or inference. Never the artist's word.
 */
export type Confidence = "own" | "transcribed" | "agent";

export type Lang = "ko" | "en";

/**
 * A sentence the map itself says, in both languages. A bare string is a word
 * of the notes kept as written (a name such as "[1] G-B Dynamics").
 */
export type Text = { ko: string; en: string } | string;

/** A quotation. Never translated: it stays as the source has it. */
export type Claim = {
  text: string;
  /** A key of NOTES (notes.ts). */
  note: string;
  /** Where in it: a diagram number, a section. */
  where?: string;
  confidence: Confidence;
};

/**
 * What the code does today.
 * working: built and seen running. partial: built in part, or in pieces not yet joined.
 * none: only in the notes. undecided: the artist has not settled what it is.
 */
export type Status = "working" | "partial" | "none" | "undecided";

export type Evidence = {
  text: Text;
  /** An experiment's registry key (components/experiments.ts), opened as a route. */
  route?: string;
  /** A file under apps/goldfishes/. */
  file?: string;
};

/** How a node is drawn. The shapes are the notes' own. */
export type NodeKind = "audience" | "mobile" | "gb-screen" | "mobiles" | "screens" | "box";

export type SystemNode = {
  id: string;
  kind: NodeKind;
  /** The name in the latest version that has it. A version may rename it. */
  label: Text;
  /** One line: what it is in the system. */
  role: Text;
  claims: Claim[];
  /** Left out for a node that exists only in a past version. */
  status?: Status;
  built?: Evidence[];
};

export type Relation = {
  id: string;
  from: string;
  to: string;
  label: Text;
  /** What passes along it. */
  carries: Text;
  /** computed: the system does it. human: a person does it, by acting or by seeing. */
  by: "computed" | "human";
  /** One line drawn with a head at each end. */
  both?: boolean;
  /** A tie with no direction (one of, part of). */
  plain?: boolean;
  claims: Claim[];
  status?: Status;
  built?: Evidence[];
};

/**
 * open: nobody is testing it. testing: an experiment is under way.
 * awaiting: tested, the artist has not judged. supported / rejected: the artist's verdict.
 * Agents write up to "awaiting". Only the artist's words set the last two.
 */
export type HypothesisState = "open" | "testing" | "awaiting" | "supported" | "rejected";

export type Hypothesis = {
  id: string;
  question: Text;
  state: HypothesisState;
  claims: Claim[];
  /** Ids of the nodes and relations it is about. */
  about: string[];
  evidence?: Evidence[];
  /** The experiment that would test it. */
  next?: Text;
  verdict?: { text: Text; date: string };
};

/**
 * A major version (v1, v2) is another structure: a node or a relation added,
 * removed, or given another meaning. A minor version (v2.1) is the same
 * structure with something in it opened, renamed or qualified (user, 2026-11-24).
 */
export type Version = {
  /** "v2" or "v2.1". */
  id: string;
  date: string;
  title: Text;
  /** Keys of NOTES. */
  sources: string[];
  summary: Text;
  nodes: string[];
  relations: string[];
  /** Names as this version had them, by node or relation id. */
  labels?: Record<string, Text>;
  /** What changed since the version before. */
  changes: Text[];
};

export type LogEntry = { date: string; text: Text };

export type Note = {
  title: Text;
  date: string;
  /** Where it can be read. */
  at: string;
  /** Its published page, opened in a new window. */
  url?: string;
};

/** Something to look at beside the work. Not a source of claims, not a rule. */
export type Reference = {
  id: string;
  title: Text;
  /** Where it opens, in a new window. */
  href: string;
  /** Its file under apps/goldfishes/. */
  file: string;
  date: string;
  /** Ids of the nodes and relations it is useful beside. */
  about: string[];
  note: Text;
};
