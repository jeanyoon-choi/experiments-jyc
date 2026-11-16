// The lies, joined into one small reel (320×240, 20 fps) with a keyframe at
// each start and no sound of its own; the sound is a separate file. One video
// element and one decoded sound serve them all.
// Every clip is cropped so the speaker's mouth sits near the middle of the
// frame's width and at `focus` of its height. Sources and cut points are in
// docs/experiments/mobile/politician-lie.md.
export const REEL = "/video/face-trace/politician-lie/lies.mp4";
/** The reel's sound alone, for Web Audio. */
export const REEL_SOUND = "/video/face-trace/politician-lie/lies.m4a";

export type Lie = {
  id: string;
  /** Seconds into the reel. */
  start: number;
  end: number;
  /** Frame row (0 top, 1 bottom) held at the participant's mouth centre. */
  focus: number;
};

export const LIES: readonly Lie[] = [
  // 이명박, 17 Aug 2007: "도곡동 땅이 어떻다고요? BBK가 어떻다고요? 새빨간 거짓말입니다."
  { id: "mb-saeppalgan", start: 0, end: 5.6, focus: 0.75 },
  // 박근혜, 29 Nov 2016: "단 한 순간도 저의 사익을 추구하지 않았고 작은 사심도 품지 않고 살아왔습니다."
  { id: "park-saik", start: 5.6, end: 17.4, focus: 0.6 },
  // 문재인, 19 Nov 2019: "(부동산 문제는 우리 정부에서는) 자신 있다고 장담하고 싶습니다."
  { id: "moon-jangdam", start: 17.4, end: 21.52, focus: 0.52 },
  // 윤석열, 6 Feb 2025: "의원이면 의원이지 인원이라는 말을 저는 써본 적이 없습니다."
  { id: "yoon-inwon", start: 21.52, end: 26.68, focus: 0.6 },
  // 이재명, Dec 2021: "…마치 제가 골프를 친 것처럼 사진을 공개했던데 … 조작한 거죠."
  { id: "lee-golf", start: 26.68, end: 42.28, focus: 0.58 },
  // 이명박, 6 Aug 2007: "여러분, 이거 다 거짓말인 거 아시죠?"
  { id: "mb-geojitmal", start: 42.28, end: 45.08, focus: 0.6 },
  // 문재인, 10 Aug 2020: "과열 현상을 빚던 주택 시장이 안정화되고, 집값 상승세가 진정되는 양상을 보이기 시작했습니다."
  { id: "moon-jinjeong", start: 45.08, end: 52.56, focus: 0.72 },
  // Bill Clinton, 26 Jan 1998: "I did not have sexual relations with that woman, Miss Lewinsky."
  { id: "clinton", start: 52.56, end: 66.72, focus: 0.6 },
  // Richard Nixon, 17 Nov 1973: "…whether or not their President is a crook. Well, I'm not a crook."
  { id: "nixon-crook", start: 66.72, end: 71.64, focus: 0.6 },
  // Donald Trump, 5 Apr 2018: "Did you know about the $130,000 payment to Stormy Daniels?" "No."
  { id: "trump-stormy", start: 71.64, end: 77.36, focus: 0.6 },
  // Ronald Reagan, 13 Nov 1986: "We did not — repeat — did not trade weapons or anything else for hostages, nor will we."
  { id: "reagan", start: 77.36, end: 85.36, focus: 0.6 },
  // Anthony Weiner, 1 Jun 2011: "Did you send that picture to that college student in Washington State?" "I did not."
  { id: "weiner", start: 85.36, end: 90.48, focus: 0.6 },
  // 박유천, 10 Apr 2019: "저는 결코 마약을 하지 않았습니다."
  { id: "yuchun", start: 90.48, end: 96.28, focus: 0.6 },
  // Lance Armstrong, 30 Nov 2005: "How could it have taken place when I've never taken performance-enhancing drugs?"
  { id: "armstrong", start: 96.28, end: 100.48, focus: 0.6 },
  // Richard Nixon, 15 Aug 1973: "I neither took part in nor knew about any of the subsequent coverup activities."
  { id: "nixon-coverup", start: 100.48, end: 106.32, focus: 0.6 },
];

/** Index of the lie playing at `time` seconds into the reel. */
export function lieAt(time: number) {
  for (let index = LIES.length - 1; index > 0; index -= 1) {
    if (time >= LIES[index].start - 0.02) return index;
  }
  return 0;
}
