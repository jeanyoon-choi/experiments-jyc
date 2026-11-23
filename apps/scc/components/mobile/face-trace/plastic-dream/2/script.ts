// What the people around her say each time an operation is done. The praise
// never stops and never turns: it only gets bigger, then emptier, then down
// to the bare words, the way HAL 9000's "Daisy Bell" runs down.

/** The part of the face a line is about; `any` fits every operation. */
export type Part = "any" | "eye" | "nose" | "mouth" | "contour" | "skin";

export type Line = {
  id: string;
  /** 0 natural, 1 excessive, 2 hollow, 3 repeating, 4 bare words. */
  stage: number;
  part: Part;
  text: string;
  /** Which of the three recorded voices says it. */
  voice: number;
};

/** Operations billed at which each stage begins. */
export const STAGES = [0, 4, 10, 20, 35] as const;

export const stageOf = (operations: number) => {
  let stage = 0;
  for (let index = 1; index < STAGES.length; index += 1) if (operations >= STAGES[index]) stage = index;
  return stage;
};

/**
 * Playback speed, and with it pitch: natural through the first ten
 * operations, then running down toward 0.6 as the tape does.
 */
export const rateOf = (operations: number) => 1 - 0.4 * (1 - Math.exp(-Math.max(0, operations - 10) / 28));

/** Catalogue row key to the part its lines are about. */
export const partOf = (key: string): Part =>
  key === "eye" || key === "inner" || key === "outer" ? "eye"
    : key === "bridge" || key === "tip" || key === "alar" ? "nose"
      : key === "lips" || key === "corner" || key === "philtrum" ? "mouth"
        : key === "cheek" || key === "jaw" || key === "chin" ? "contour"
          : "skin";

const line = (id: string, stage: number, part: Part, voice: number, text: string): Line => ({ id, stage, part, text, voice });

export const LINES: readonly Line[] = [
  // 0 — how it is actually said, to her face.
  line("a01", 0, "any", 0, "언니, 왜 이렇게 예뻐졌어?"),
  line("a02", 0, "any", 1, "언니 왜 이렇게 젊어 보여?"),
  line("a03", 0, "any", 2, "어머, 뭐 했어? 얼굴이 확 폈다."),
  line("a04", 0, "any", 0, "살 빠졌어? 뭔가 달라졌는데."),
  line("a05", 0, "any", 1, "요즘 좋은 일 있어? 분위기가 달라."),
  line("a06", 0, "any", 2, "티 하나도 안 나, 진짜 자연스럽다."),
  line("a07", 0, "eye", 0, "눈 어디서 했어? 진짜 자연스럽다."),
  line("a08", 0, "eye", 1, "눈이 되게 시원해졌다, 언니."),
  line("a09", 0, "nose", 2, "코 했지? 라인 진짜 예쁘게 나왔다."),
  line("a10", 0, "nose", 0, "옆모습 봐, 코가 딱 살았네."),
  line("a11", 0, "mouth", 1, "입술 뭐 맞았어? 도톰하니 예쁘다."),
  line("a12", 0, "mouth", 2, "웃는 상 됐다, 인상이 확 좋아졌어."),
  line("a13", 0, "contour", 0, "얼굴이 반쪽이 됐네, 반쪽이."),
  line("a14", 0, "contour", 1, "턱선 봐, 브이라인 제대로다."),
  line("a15", 0, "skin", 2, "피부 뭐 맞았어? 광이 나, 광이."),
  line("a16", 0, "skin", 0, "이마가 볼록하니 애기 같다, 언니."),
  // 1 — too much.
  line("b01", 1, "any", 1, "미쳤다 진짜, 연예인인 줄 알았어."),
  line("b02", 1, "any", 2, "언니 얼굴 무슨 일이야, 사람이 달라졌어."),
  line("b03", 1, "any", 0, "스무 살 같아, 진짜로. 스무 살."),
  line("b04", 1, "any", 1, "원장님 누구야? 나도 당장 예약할래."),
  line("b05", 1, "any", 2, "길 가다 보면 다 쳐다보겠다, 언니."),
  line("b06", 1, "any", 0, "돈값 한다 진짜, 하나도 안 아깝다."),
  line("b07", 1, "eye", 1, "눈이 얼굴의 반이야, 완전 인형이네."),
  line("b08", 1, "nose", 2, "코가 조각이야 조각, 미쳤다 진짜."),
  line("b09", 1, "mouth", 0, "입술 봐, 화보야 화보."),
  line("b10", 1, "contour", 1, "얼굴이 주먹만 해, 주먹만."),
  line("b11", 1, "skin", 2, "피부가 도자기야, 모공이 없어 모공이."),
  // 2 — nothing in it but the superlative.
  line("c01", 2, "any", 0, "완벽해. 완벽해 언니. 그냥 완벽해."),
  line("c02", 2, "any", 1, "여신이야 여신. 진짜 여신."),
  line("c03", 2, "any", 2, "인형이야 인형. 사람이 아니야."),
  line("c04", 2, "any", 0, "너무 예뻐. 너무너무 예뻐. 너무너무너무 예뻐."),
  line("c05", 2, "any", 1, "세상에서 제일 예뻐. 제일. 제일 예뻐."),
  line("c06", 2, "any", 2, "더 예뻐졌어. 또 예뻐졌어. 계속 예뻐져."),
  line("c07", 2, "any", 0, "열 살은 어려 보여. 아니 스무 살. 스무 살은 어려 보여."),
  line("c08", 2, "any", 1, "최고야 최고. 최고 최고 최고."),
  // 3 — the same words again.
  line("d01", 3, "any", 2, "예쁘다. 진짜 예쁘다. 예쁘다."),
  line("d02", 3, "any", 0, "언니 예뻐. 예뻐. 예뻐."),
  line("d03", 3, "any", 1, "젊어. 더 젊어. 더. 더."),
  line("d04", 3, "any", 2, "예뻐졌어. 예뻐졌어. 예뻐졌어."),
  line("d05", 3, "any", 0, "완벽. 완벽. 완벽해."),
  line("d06", 3, "any", 1, "언니. 언니. 예뻐 언니."),
  // 4 — only the words are left.
  line("e01", 4, "any", 2, "예쁨. 예쁨. 예쁨."),
  line("e02", 4, "any", 0, "언니. 예뻐. 졌어."),
  line("e03", 4, "any", 1, "젊음. 완벽. 예쁨."),
  line("e04", 4, "any", 2, "예. 뻐. 예. 뻐."),
  line("e05", 4, "any", 0, "왜. 이렇게. 예뻐. 졌어."),
  line("e06", 4, "any", 1, "예뻐. 예뻐. 예뻐. 예뻐. 예뻐."),
];

/**
 * Ids of the lines and laughs that have been recorded and sit in
 * /public/audio/plastic-dream/ as `<id>.mp3`; only these sound. The present
 * recordings are stand-ins made with macOS's built-in Korean voices (Yuna,
 * Flo, Sandy), to be replaced file for file by realistic ones.
 */
export const RECORDED: readonly string[] = LINES.map((entry) => entry.id);
export const LAUGHS: readonly string[] = ["laugh-1", "laugh-2", "laugh-3"];
