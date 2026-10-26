// The man on the rope supplies the vocabulary. Spaces and hyphens are shown
// from the start; only A–Z are guessed.
export const WORDS = [
  "TARIFF", "COVFEFE", "BIGLY", "THE WALL", "FAKE NEWS", "WITCH HUNT", "MAR-A-LAGO",
  "GOLF", "TWEET", "TRUTH SOCIAL", "IMPEACHMENT", "TREMENDOUS", "HUGE", "LOSER",
  "YOURE FIRED", "THE APPRENTICE", "WHITE HOUSE", "CAMPAIGN", "RALLY", "DEAL",
  "TOWER", "CASINO", "STEAK", "HAMBURGER", "MAGA", "RED HAT", "LONG TIE",
  "SPRAY TAN", "COMBOVER", "COURTROOM", "INDICTMENT", "MUGSHOT", "ELECTION",
  "LANDSLIDE", "RIGGED", "SAD", "WINNING", "BEAUTIFUL", "BELIEVE ME", "EXECUTIVE ORDER",
] as const;

export const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
] as const;

export const isLetter = (character: string) => /^[A-Z]$/.test(character);
