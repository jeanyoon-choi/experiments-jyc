// 공시가격, as this work reckons it. NOT 국토교통부's published figures: no
// real assessed price is used anywhere. The number is a model that makes the
// premise of 역세권 literal — land is worth what the ride from its station
// costs — so that moving a station moves its price:
//
//   t      = the shortest of the rides to 강남, 시청 (+8분) and 여의도 (+6분)
//   ㎡당 = FLOOR + PEAK · e^(−t / FADE)   (만원)
//
// 0분 from 강남 is 2,400만원/㎡; 13분 about 1,510; 30분 about 860; 60분 about
// 370. The constants are set by hand to fall in the order of magnitude of
// Seoul apartment 공시가격 per ㎡, not fitted to data.

const FLOOR = 150;
const PEAK = 2250;
const FADE = 26;
const HANDICAP = { 강남: 0, 시청: 8, 여의도: 6 } as const;

export type Centre = keyof typeof HANDICAP;

/** 만원 per ㎡ for a station with these rides (minutes) to the three centres. */
export function assessed(rides: Record<Centre, number>) {
  let t = Infinity;
  for (const centre of Object.keys(HANDICAP) as Centre[]) t = Math.min(t, rides[centre] + HANDICAP[centre]);
  return FLOOR + PEAK * Math.exp(-t / FADE);
}
