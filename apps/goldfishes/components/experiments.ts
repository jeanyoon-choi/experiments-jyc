import type { ComponentType } from "react";

export type GoldfishExperiment = {
  key: string;
  legacyKeys?: readonly string[];
  area: "screen" | "pc" | "desktop" | "mobile";
  section: "default" | "2d" | "dated";
  date: string | null;
  /**
   * ISO date of its latest major revision: behaviour or meaning changed at the
   * user's request (not renames, moves, config, docs or refactors). The date
   * view lists the experiment under this date; dated archives keep `date`.
   */
  updated?: string;
  phrase: string;
  load: () => Promise<{ default: ComponentType }>;
};

export const goldfishExperiments: readonly GoldfishExperiment[] = [
  { key: "mobile/keyword-grid/2", legacyKeys: ["mobile/0930/2"], area: "mobile", section: "dated", date: "2026-09-30", phrase: "Combine hype words · colored bubbles collide and shrink with time", load: () => import("./mobile/keyword-grid/2") },
  { key: "mobile/keyword-grid/1", legacyKeys: ["mobile/0930/1"], area: "mobile", section: "dated", date: "2026-09-30", phrase: "Square dot map · configure a keyword, place it on a point, finger-skate to keep it alive", load: () => import("./mobile/keyword-grid/1") },
  { key: "desktop/native-windows/1", legacyKeys: ["desktop/0915/1"], area: "desktop", section: "dated", date: "2026-09-15", phrase: "Native desktop · preserved configurable baseline", load: () => import("./desktop/native-windows/1/controller") },
  { key: "desktop/native-windows/2", legacyKeys: ["desktop/0915/2"], area: "desktop", section: "dated", date: "2026-09-15", phrase: "Native windows · accumulation, drift and interrupted attention", load: () => import("./desktop/native-windows/2/controller") },
  { key: "desktop/native-windows/3", legacyKeys: ["desktop/0915/3"], area: "desktop", section: "dated", date: "2026-09-15", phrase: "Return and interrupt · new pages mixed with random tab revisits", load: () => import("./desktop/native-windows/3/controller") },
  {
    key: "screen/default",
    legacyKeys: ["default", "3d/1"],
    area: "screen",
    section: "default",
    date: null,
    phrase: "Orthographic 3D goldfish attraction field",
    load: () => import("./screen/archive/default"),
  },
  {
    key: "screen/2d/1",
    legacyKeys: ["2d/1"],
    area: "screen",
    section: "2d",
    date: null,
    phrase: "Glyph swarm and media attention cells",
    load: () => import("./screen/archive/2d/1"),
  },
  {
    key: "screen/attraction-targets/1",
    legacyKeys: ["screen/0804/tube", "0804/tube", "3d/2", "0804/1"],
    area: "screen",
    section: "dated",
    date: "2026-08-04",
    phrase: "Tube stations as persistent attraction targets",
    load: () => import("./screen/archive/attraction-targets/1"),
  },
  {
    key: "screen/attraction-targets/2",
    legacyKeys: ["screen/0804/html", "0804/html"],
    area: "screen",
    section: "dated",
    date: "2026-08-04",
    phrase: "Live HTML forms as bidirectional attraction targets",
    load: () => import("./screen/archive/attraction-targets/2"),
  },
  {
    key: "screen/attraction-targets/3",
    legacyKeys: ["screen/0804/node-edge", "0804/node-edge"],
    area: "screen",
    section: "dated",
    date: "2026-08-04",
    phrase: "Entropy-generated 3D topology as a persistent attraction field",
    load: () => import("./screen/archive/attraction-targets/3"),
  },
  {
    key: "screen/pillars/1",
    legacyKeys: ["screen/0804/pillars", "0804/pillars", "3d/3", "0804/2"],
    area: "screen",
    section: "dated",
    date: "2026-08-04",
    phrase: "Randomized vertical attention pillars",
    load: () => import("./screen/archive/pillars/1"),
  },
  {
    key: "screen/pillars/2",
    legacyKeys: ["screen/0806/side-view", "0806/side-view"],
    area: "screen",
    section: "dated",
    date: "2026-08-06",
    phrase: "Pillars fork with a side-on initial view",
    load: () => import("./screen/archive/pillars/2"),
  },
  {
    key: "screen/media-grid/1",
    legacyKeys: ["screen/0806/compositional-grid", "0806/compositional-grid"],
    area: "screen",
    section: "dated",
    date: "2026-08-06",
    phrase: "Locally reconfiguring composite media grid",
    load: () => import("./screen/archive/media-grid/1"),
  },
  {
    key: "screen/pillars/3",
    legacyKeys: ["screen/0806/duration", "0806/duration"],
    area: "screen",
    section: "dated",
    date: "2026-08-06",
    phrase: "Temporal pillars accumulating beneath a fixed present",
    load: () => import("./screen/archive/pillars/3"),
  },
  {
    key: "screen/pillars/4",
    legacyKeys: ["screen/0806/temporal-decay", "0806/temporal-decay"],
    area: "screen",
    section: "dated",
    date: "2026-08-06",
    phrase: "Short-lived active strata leaving frozen pillars",
    load: () => import("./screen/archive/pillars/4"),
  },
  {
    key: "screen/keyword-field/2",
    legacyKeys: ["screen/0908/aggregated", "0908/aggregated"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "A goldfish school attending a spreading keyword field",
    load: () => import("./screen/archive/keyword-field/2"),
  },
  {
    key: "screen/keyword-field/1",
    legacyKeys: ["screen/0908/dots", "0908/dots"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Instagram/4 keyword field preserved unchanged",
    load: () => import("./screen/archive/keyword-field/1"),
  },
  {
    key: "screen/overlay-3d/1",
    legacyKeys: ["screen/0908/overlay", "0908/overlay"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Original Instagram/4 field with a transparent goldfish school",
    load: () => import("./screen/archive/overlay-3d/1"),
  },
  {
    key: "screen/overlay-3d/2",
    legacyKeys: ["screen/0908/overlay-2", "0908/overlay-2"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Original 3D goldfish school with configurable keyword surfaces",
    load: () => import("./screen/archive/overlay-3d/2"),
  },
  {
    key: "screen/overlay-3d/3",
    legacyKeys: ["screen/0908/overlay-3", "0908/overlay-3"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Original 3D goldfish school with switchable technology typefaces",
    load: () => import("./screen/archive/overlay-3d/3"),
  },
  {
    key: "screen/overlay-3d/4",
    legacyKeys: ["screen/0908/overlay-4", "0908/overlay-4"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Recorded underwater textures from goldfish approach events",
    load: () => import("./screen/archive/overlay-3d/4"),
  },
  {
    key: "screen/overlay-3d/5",
    legacyKeys: ["screen/0908/overlay-5", "0908/overlay-5"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Slower, roomier attention field with approach rings initially hidden",
    load: () => import("./screen/archive/overlay-3d/5"),
  },
  {
    key: "screen/overlay-2d/1",
    legacyKeys: ["screen/0908/overlay-2d", "0908/overlay-2d"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Original Instagram/4 field with Canvas2D goldfish glyphs",
    load: () => import("./screen/archive/overlay-2d/1"),
  },
  {
    key: "screen/overlay-2d/2",
    legacyKeys: ["screen/0908/overlay-2d-2", "0908/overlay-2d-2"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Persistent individual goldfish trails replacing influence edges",
    load: () => import("./screen/archive/overlay-2d/2"),
  },
  {
    key: "screen/overlay-2d/3",
    legacyKeys: ["screen/0908/overlay-2d-3", "0908/overlay-2d-3"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Local attention and trail memory co-evolving with the keyword field",
    load: () => import("./screen/archive/overlay-2d/3"),
  },
  {
    key: "screen/overlay-2d/4",
    legacyKeys: ["screen/0908/overlay-2d-4", "0908/overlay-2d-4"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Explicit fish targets, attention contact and keyword propagation",
    load: () => import("./screen/archive/overlay-2d/4"),
  },
  {
    key: "screen/attention-print/1",
    legacyKeys: ["screen/0908/attention-print", "0908/attention-print"],
    area: "screen",
    section: "dated",
    date: "2026-09-08",
    phrase: "Serial technology signs interrupted by living attention and accumulated ink",
    load: () => import("./screen/archive/attention-print/1"),
  },
  {
    key: "screen/tech-eyes/1",
    legacyKeys: ["screen/0922/default", "0922/default"],
    area: "screen",
    section: "dated",
    date: "2026-09-22",
    phrase: "Preserved overlay-5 attention field as the 0922 baseline",
    load: () => import("./screen/archive/tech-eyes/1"),
  },
  {
    key: "screen/tech-eyes/2",
    legacyKeys: ["screen/tech-eyes/3", "screen/0922/interactive", "0922/interactive"],
    area: "screen",
    section: "dated",
    date: "2026-09-28",
    phrase: "Click to place each story bubble freely among the goldfish",
    load: () => import("./screen/archive/tech-eyes/2"),
  },
  {
    key: "screen/bubble/1",
    area: "screen",
    section: "dated",
    date: "2026-10-20",
    phrase: "SCC bubble/3's PageRank foam raft and goldfish, opening on 기본값 3",
    load: () => import("./screen/bubble/1"),
  },
  {
    key: "screen/bubble/2",
    area: "screen",
    section: "dated",
    date: "2026-10-20",
    phrase: "bubble/1's raft with every bubble a lobe of Koons's coated mirror steel",
    load: () => import("./screen/bubble/2"),
  },
  {
    key: "screen/bubble/3",
    area: "screen",
    section: "dated",
    date: "2026-10-22",
    phrase: "bubble/2's raft as a material lab: physically based parameters, a view from above or the side, looks to switch between",
    load: () => import("./screen/bubble/3"),
  },
  {
    key: "pc/news-phones/1",
    legacyKeys: ["pc/0908/default"],
    area: "pc",
    section: "dated",
    date: "2026-09-08",
    phrase: "Independent keyword-driven news phones, one per goldfish",
    load: () => import("./pc/news-phones/1"),
  },
  {
    key: "pc/news-phones/2",
    legacyKeys: ["pc/0908/variations"],
    area: "pc",
    section: "dated",
    date: "2026-09-08",
    phrase: "Mobile colour and keyword surface variations",
    load: () => import("./pc/news-phones/2"),
  },
  {
    key: "pc/image-search/1",
    legacyKeys: ["pc/0910/image-search"],
    area: "pc",
    section: "dated",
    date: "2026-09-10",
    phrase: "Desktop image-search grammar under subsecond technology-query replacement",
    load: () => import("./pc/image-search/1"),
  },
];

// Dated archives stay addressable as `/<area>/<MMDD>`: an experiment belongs to
// the archive of its registry date and to any former dated folder in its
// legacy keys.
export function getGoldfishDateKey(date: string) {
  return date.slice(5).replace("-", "");
}

export const goldfishExperimentDateKeys = Array.from(
  new Set(
    goldfishExperiments.flatMap((experiment) =>
      experiment.date === null ? [] : [getGoldfishDateKey(experiment.date)],
    ),
  ),
);

export function findGoldfishExperiment(path: readonly string[]) {
  const key = path.join("/");
  return goldfishExperiments.find(
    (experiment) =>
      experiment.key === key || experiment.legacyKeys?.includes(key),
  );
}

export function getGoldfishExperimentsForDate(
  dateKey: string,
  area: GoldfishExperiment["area"] = "screen",
) {
  return goldfishExperiments.filter(
    (experiment) =>
      experiment.area === area &&
      experiment.section === "dated" &&
      experiment.date !== null &&
      (getGoldfishDateKey(experiment.date) === dateKey ||
        experiment.legacyKeys?.some((key) =>
          key.startsWith(`${area}/${dateKey}/`),
        )),
  );
}
