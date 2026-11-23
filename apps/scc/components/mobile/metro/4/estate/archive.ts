import type { Scene } from "../scene";
import { CENTRES, MAJOR, type Ride, ridesTo } from "../travel";
import { PRESS, headline } from "./headlines";
import { PHOTOS } from "./photos";

// The 부동산 archive. Every time the tab is opened, the rides that have
// changed since they were last reported become reports, newest on top; what
// was reported before stays underneath. Nothing is ever taken out.

export type Item = { key: number; title: string; press: string; photo: string; at: number; comments: number };

export type Archive = {
  items: Item[];
  /** Minutes last reported, per station id and centre. */
  reported: Map<string, number>;
  next: number;
  random: () => number;
};

/** Rides shorter or longer by fewer minutes than this are not news. */
const NEWSWORTHY = 2;
/** Reports per opening, the largest changes. */
const MOST = 12;

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const createArchive = (): Archive => ({ items: [], reported: new Map(), next: 0, random: mulberry32(20261123) });

function report(archive: Archive, station: string, centre: string, before: number, now: number, at: number) {
  const { random } = archive;
  const last = archive.items[0];
  let photo = PHOTOS[Math.floor(random() * PHOTOS.length)];
  while (last && photo === last.photo) photo = PHOTOS[Math.floor(random() * PHOTOS.length)];
  archive.items.unshift({
    key: archive.next,
    title: headline({ station, centre, before, now }, random),
    press: PRESS[Math.floor(random() * PRESS.length)],
    photo,
    at,
    comments: Math.floor(8 + random() * 60 + Math.abs(now - before) * (4 + random() * 9)),
  });
  archive.next += 1;
}

/** Brings the archive up to the map as it now lies and returns its items, newest first. */
export function update(archive: Archive, scene: Scene, time: number): Item[] {
  const rides = CENTRES.map((centre) => ({ centre, rides: ridesTo(scene, centre) }));
  const stations = scene.marks.filter((m) => !(CENTRES as readonly string[]).includes(m.name));

  if (archive.next === 0) {
    // Before anything is moved: the major stations' rides as printed, spread over the last hours.
    const major = stations.filter((m) => MAJOR.has(m.name));
    major.forEach((m, i) => {
      const { centre, rides: map } = rides[i % rides.length];
      const ride = map?.get(m.node);
      if (!ride) return;
      const minutes = Math.round(ride.before);
      report(archive, m.name, centre, minutes, minutes, time - (6 + (major.length - i) * 17 + archive.random() * 9) * 60_000);
    });
  }

  // Per station, the centre its ride changed most toward since it was last reported.
  const moves: { id: string; station: string; centre: string; before: number; now: number }[] = [];
  for (const m of stations) {
    let best: (typeof moves)[number] | null = null;
    for (const { centre, rides: map } of rides) {
      const ride: Ride | undefined = map?.get(m.node);
      if (!ride) continue;
      const now = Math.round(ride.now);
      const before = archive.reported.get(`${m.id}|${centre}`) ?? Math.round(ride.before);
      if (Math.abs(now - before) < NEWSWORTHY) continue;
      if (!best || Math.abs(now - before) > Math.abs(best.now - best.before)) best = { id: m.id, station: m.name, centre, before, now };
    }
    if (best) moves.push(best);
  }
  moves.sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before));
  const news = moves.slice(0, MOST).reverse();
  news.forEach((move, i) => report(archive, move.station, move.centre, move.before, move.now, time - (news.length - 1 - i) * 1000));
  // Every change counts as reported, the ones left out too, so opening the tab again without moving anything adds nothing.
  for (const move of moves) archive.reported.set(`${move.id}|${move.centre}`, move.now);
  return archive.items;
}
