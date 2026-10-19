/**
 * Splits a run of adjacent text into the parts that do different jobs, and names each part's job.
 * Pure: the DOM side hands in strings and gets back character spans.
 */

/** What a piece of interface text is for. */
export type TextRole = "handle" | "time" | "count" | "tag" | "name" | "title" | "control" | "copy";

export type TokenSpan = { start: number; end: number; text: string };

/** Middle dots, bullets and bars join different things on one line (`@ada · 2m`); they are not part of either. */
const separator = /\s*[·•|]\s*/g;

/**
 * The parts of one run of text: split at separators, then at hashtags and mentions inside copy, each trimmed.
 * Offsets index the run's full string.
 */
export function splitTokens(run: string): TokenSpan[] {
  const pieces: TokenSpan[] = [];
  let from = 0;
  for (const match of run.matchAll(separator)) {
    pieces.push({ start: from, end: match.index, text: run.slice(from, match.index) });
    from = match.index + match[0].length;
  }
  pieces.push({ start: from, end: run.length, text: run.slice(from) });

  const tokens: TokenSpan[] = [];
  for (const piece of pieces) {
    // A tag or mention inside a sentence links somewhere else; it is its own part.
    let cursor = piece.start;
    const inline = /(^|\s)([#@][\p{L}\p{N}_.]+)/gu;
    const text = run.slice(piece.start, piece.end);
    const isWholeMention = /^\s*[#@][\p{L}\p{N}_.]+\s*$/u.test(text);
    if (!isWholeMention) {
      for (const match of text.matchAll(inline)) {
        const start = piece.start + match.index + match[1].length;
        const end = start + match[2].length;
        push(tokens, run, cursor, start);
        push(tokens, run, start, end);
        cursor = end;
      }
    }
    push(tokens, run, cursor, piece.end);
  }
  return tokens;
}

function push(tokens: TokenSpan[], run: string, start: number, end: number) {
  while (start < end && /\s/.test(run[start])) start++;
  while (end > start && /\s/.test(run[end - 1])) end--;
  if (end > start) tokens.push({ start, end, text: run.slice(start, end) });
}

const relativeTime = /^(\d+\s?(s|m|h|d|w|mo|y|sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|day|days|wk|wks|week|weeks|month|months|year|years)( ago)?|now|just now|yesterday|today|\d+\s?(초|분|시간|일|주|개월|달|년)\s?전?|방금)$/i;
const clockOrDate = /^(\d{1,2}:\d{2}(\s?[ap]m)?|\d{1,2}:\d{2}:\d{2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? \d{1,2}(, \d{4})?|\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?( \d{4})?|\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}월 \d{1,2}일)$/i;
const count = /^[+-]?[\d.,]+\s?([kmb]|만|천|억)?(\s?(views?|likes?|replies|reposts?|comments?|followers?|following|posts?|subscribers?|videos?|watching|회|명|개))?$/i;

/** Where the text sits: whether it is bold, a heading, and whether it is inside a control or link. */
export type TextContext = { bold: boolean; heading: boolean; interactive: boolean };

/** The role a part plays. Handles, times and counts are recognised by form before anything about their place. */
export function textRole(text: string, context: TextContext): TextRole {
  const value = text.trim();
  if (/^@[\p{L}\p{N}_.]+$/u.test(value)) return "handle";
  if (/^#[\p{L}\p{N}_]+$/u.test(value)) return "tag";
  if (relativeTime.test(value) || clockOrDate.test(value)) return "time";
  if (count.test(value)) return "count";
  if (context.heading) return "title";
  // A username (mara.k, jules_cooks) names someone wherever it sits.
  if (/^[\p{Ll}\p{N}_.]+$/u.test(value) && /[\p{Ll}]/u.test(value) && (/[._\p{N}]/u.test(value) || context.bold)) return "name";
  // A capitalised one- or two-word label in a control (Follow, Subscribe, Edit profile) is the control's;
  // other short bold text names someone.
  const label = context.interactive && /^\p{Lu}[\p{Ll}]*( [\p{Ll}]+)?$/u.test(value);
  if (context.bold && value.length <= 40 && !/[.!?]$/.test(value)) return label ? "control" : "name";
  if (context.interactive && value.length <= 32) return "control";
  return "copy";
}
