import { lines } from "./model";
import type { Scene } from "./scene";

// Travel time, read off the map. Two rough rules, no timetable:
//
// 1. As printed, one stop along a line takes that line's average minutes per
//    stop (MINUTES_PER_STOP) — the "한 정거장 2분" rule, set per line from its
//    end-to-end running time over its number of stops — and a change of line
//    costs TRANSFER minutes. The ride between two stations is the shortest
//    path over (station, line) states. These are approximations from memory
//    of all-stop services, not measured from a timetable.
// 2. Once stations are moved, the ride is a matter of distance on the map:
//    the printed minutes times how much nearer or farther the two stations
//    now lie on the paper than they were printed. A station put half as far
//    from 강남 is half as long a ride from it.

/** The three centres rides are counted to: 강남, 시청 (the old centre) and 여의도. */
export const CENTRES = ["강남", "시청", "여의도"] as const;

/** Stations listed while nothing has been moved. */
export const MAJOR: ReadonlySet<string> = new Set([
  "강남", "시청", "여의도", "서울역", "잠실", "홍대입구", "종로3가", "고속터미널", "사당", "왕십리",
  "건대입구", "용산", "신도림", "영등포", "청량리", "노원", "수서", "판교", "수원", "인천",
  "김포공항", "인천공항1터미널", "동대문역사문화공원", "합정", "삼성", "교대", "광화문", "명동", "성수", "부평",
  "일산", "의정부", "정자", "연신내", "천호", "구로디지털단지", "가산디지털단지", "불광",
]);

export const MINUTES_PER_STOP: Record<string, number> = {
  "1": 2.6,
  "2": 2.1,
  "3": 2.2,
  "4": 2.3,
  "5": 2.0,
  "6": 2.0,
  "7": 2.0,
  "8": 2.0,
  "9": 1.8,
  "suin-bundang": 2.4,
  shinbundang: 2.8,
  "gyeongui-jungang": 2.9,
  gyeongchun: 4.3,
  airport: 5.0,
  gyeonggang: 4.4,
  seohae: 3.3,
  "gtx-a": 6.0,
  "incheon-1": 2.0,
  "incheon-2": 1.9,
  uijeongbu: 1.4,
  everline: 2.1,
  "ui-sinseol": 1.9,
  "gimpo-gold": 3.5,
  sillim: 1.6,
};
const FALLBACK_MINUTES = 2.2;
export const TRANSFER = 4;

/** Minutes from the station at node `origin` to every station node, on the map as printed. */
export function minutesPrinted(scene: Scene, origin: number): Map<number, number> {
  const lineIndex = new Map(lines.map((l, i) => [l.id, i]));
  const L = lines.length;
  // Hops per station node: neighbour, line, minutes.
  const hops = new Map<number, { to: number; line: number; minutes: number }[]>();
  const add = (from: number, to: number, line: number, minutes: number) => {
    const list = hops.get(from) ?? [];
    hops.set(from, list);
    list.push({ to, line, minutes });
  };
  for (const r of scene.runs) {
    const a = r.ids[0];
    const b = r.ids[r.ids.length - 1];
    const line = lineIndex.get(r.line)!;
    const minutes = MINUTES_PER_STOP[r.line] ?? FALLBACK_MINUTES;
    add(a, b, line, minutes);
    add(b, a, line, minutes);
  }
  // Dijkstra over (station, line) states, keyed node · L + line.
  const best = new Map<number, number>();
  const open = new Map<number, number>();
  for (const h of hops.get(origin) ?? []) open.set(origin * L + h.line, 0);
  while (open.size) {
    let key = -1;
    let d = Infinity;
    for (const [k, v] of open) {
      if (v < d) {
        d = v;
        key = k;
      }
    }
    open.delete(key);
    best.set(key, d);
    const node = Math.floor(key / L);
    const line = key % L;
    for (const h of hops.get(node) ?? []) {
      const next = h.to * L + h.line;
      if (best.has(next)) continue;
      const cost = d + h.minutes + (h.line === line ? 0 : TRANSFER);
      if (cost < (open.get(next) ?? Infinity)) open.set(next, cost);
    }
  }
  const byStation = new Map<number, number>();
  for (const [key, d] of best) {
    const node = Math.floor(key / L);
    if (d < (byStation.get(node) ?? Infinity)) byStation.set(node, d);
  }
  return byStation;
}

/**
 * The ride between the stations at nodes `origin` and `node` as the map now
 * lies: `printed` minutes scaled by their distance on the paper now over
 * their distance as printed.
 */
export function minutesNow(scene: Scene, origin: number, node: number, printed: number) {
  const was = scene.printed;
  const pos = scene.net.pos;
  const before = Math.hypot(was[node * 2] - was[origin * 2], was[node * 2 + 1] - was[origin * 2 + 1]);
  if (before < 1e-6) return printed;
  const after = Math.hypot(pos[node * 2] - pos[origin * 2], pos[node * 2 + 1] - pos[origin * 2 + 1]);
  return (printed * after) / before;
}

export type Ride = { before: number; now: number };

/** Every station node's ride to the centre named `centre`, as printed and as the map now lies; null if the map has no such station. */
export function ridesTo(scene: Scene, centre: string): Map<number, Ride> | null {
  const origin = scene.marks.find((m) => m.name === centre);
  if (!origin) return null;
  const rides = new Map<number, Ride>();
  for (const [node, before] of minutesPrinted(scene, origin.node)) rides.set(node, { before, now: minutesNow(scene, origin.node, node, before) });
  return rides;
}
