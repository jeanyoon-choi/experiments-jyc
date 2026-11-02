// Reader values → the handful of situations the rooms react to. Every
// trigger is 0–1. The rooms never see raw blendshapes, only these readings
// and a few measured numbers they can quote back.

export const TRIGGERS = [
  "smile", // any smile
  "fake", // mouth smiles, eyes do not: the mask
  "laugh",
  "blank", // held neutral face: no expression is also an expression
  "frown",
  "angry",
  "sad",
  "disgust",
  "smirk",
  "surprise",
  "tilt", // head tilt either side
  "turn", // looking away
  "down", // chin down / looking down
  "shut", // eyes closed
  "nervous", // fast blinking
  "close", // face too close, face fills the frame: looks
  "cute", // kiss, puff, duckface
  "talk",
  "gone", // face lost
] as const;

export type Trigger = (typeof TRIGGERS)[number];
export type TriggerLevels = Record<Trigger, number>;

/** Numbers a message can quote. */
export type Measures = {
  smileHeld: number;
  tiltDeg: number;
  turnDeg: number;
  blinkRate: number;
  blinks: number;
  stillness: number;
  asymmetry: number;
  faceFill: number;
  sinceBlink: number;
};

export type Signals = { present: boolean; levels: TriggerLevels; measures: Measures };

export const emptyLevels = (): TriggerLevels =>
  Object.fromEntries(TRIGGERS.map((trigger) => [trigger, 0])) as TriggerLevels;

export const emptyMeasures = (): Measures => ({
  smileHeld: 0, tiltDeg: 0, turnDeg: 0, blinkRate: 0, blinks: 0, stillness: 0, asymmetry: 0, faceFill: 0, sinceBlink: 0,
});

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** `get` reads one /1 reading by id (conditions 0–1, angles in degrees). */
export function readTriggers(get: (id: string) => number, present: boolean, lostFor: number): Signals {
  const levels = emptyLevels();
  const measures = emptyMeasures();
  if (!present) {
    levels.gone = clamp((lostFor - 400) / 1600);
    return { present, levels, measures };
  }
  const smile = get("smile");
  const duchenne = get("duchenne");
  levels.smile = smile;
  levels.fake = clamp(smile * (1 - duchenne * 1.6));
  levels.laugh = Math.max(get("laugh"), get("grin") * 0.6);
  levels.frown = Math.max(get("frown"), get("pout") * 0.7, get("furrow") * 0.6);
  levels.angry = Math.max(get("angry"), get("rage"));
  levels.sad = Math.max(get("sad"), get("cry"), get("worry") * 0.7);
  levels.disgust = Math.max(get("disgust"), get("sneer-l"), get("sneer-r"));
  levels.smirk = Math.max(get("smirk-l"), get("smirk-r"), get("contempt"));
  levels.surprise = Math.max(get("surprise"), get("shock"), get("wide-eyes") * 0.7, get("brows-up") * 0.6);
  levels.tilt = Math.max(get("tilt-l"), get("tilt-r"));
  levels.turn = Math.max(get("turn-l"), get("turn-r"), get("look-l") * 0.7, get("look-r") * 0.7);
  levels.down = Math.max(get("chin-down"), get("look-down"));
  levels.shut = get("eyes-shut");
  levels.nervous = clamp((get("blink-rate") - 22) / 18);
  levels.close = Math.max(get("close"), clamp((get("face-fill") - 0.32) / 0.25));
  levels.cute = Math.max(get("kiss"), get("duckface"), get("puff"));
  levels.talk = get("talking");
  // Blank: little energy and the face has held still for a while.
  const energy = get("energy");
  levels.blank = clamp((1 - energy * 3) * clamp((get("stillness") - 2.5) / 4)) * (1 - smile);

  measures.smileHeld = get("smile-held");
  measures.tiltDeg = Math.abs(get("roll"));
  measures.turnDeg = Math.abs(get("yaw"));
  measures.blinkRate = get("blink-rate");
  measures.blinks = get("blinks");
  measures.stillness = get("stillness");
  measures.asymmetry = get("asymmetry");
  measures.faceFill = get("face-fill");
  measures.sinceBlink = get("since-blink");
  return { present, levels, measures };
}
