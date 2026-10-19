/** The three vocabularies: readings of what Instagram asks of the person holding it. Data only; `reading.ts` applies them. */
export type CommandGroup = "consumption" | "discipline" | "attention";

export const commandGroups: { id: CommandGroup; label: string; words: readonly string[] }[] = [
  {
    id: "consumption",
    label: "소비",
    words: ["DESIRE", "SEARCH", "FILTER", "COMPARE", "SELECT", "CUSTOMIZE", "ACCUMULATE", "PRICE", "BUY", "CONSUME", "RESERVE", "PAY", "EXCHANGE"],
  },
  {
    id: "discipline",
    label: "규율",
    words: ["OBEY", "CONFORM", "PLAN", "SCHEDULE", "OPTIMIZE", "TRACK", "VERIFY", "COMPLETE", "REPORT", "PERFORM", "COMPLY", "REPEAT"],
  },
  {
    id: "attention",
    label: "주의",
    words: ["WATCH", "SCROLL", "FOLLOW", "LIKE", "SAVE", "REPOST", "REPLY", "SHARE", "POST", "STAY", "RETURN", "AMPLIFY"],
  },
];
