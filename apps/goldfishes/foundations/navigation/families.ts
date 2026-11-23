export type GoldfishArea =
  | "screen"
  | "pc";

export const goldfishAreas: readonly { key: GoldfishArea; href: string }[] = [
  { key: "screen", href: "/screen" },
  { key: "pc", href: "/pc" },
];

export type GoldfishFamily = {
  key: string;
  area: GoldfishArea;
  label: string;
  /** Experiment keys in lineage order; each key belongs to one family. */
  members: readonly string[];
};

// Lineages for the group view. A family is a folder of components/<area>/ and is named as that folder is; in each
// area the work under way comes first, then its archive (components/<area>/archive/), each in the order it began. A
// registered experiment missing here appears under its area's "unsorted"
// family until it is assigned.
export const goldfishFamilies: readonly GoldfishFamily[] = [
  {
    key: "screen:bubble",
    area: "screen",
    label: "bubble",
    members: ["screen/bubble/1", "screen/bubble/2", "screen/bubble/3", "screen/bubble/4", "screen/bubble/5", "screen/bubble/6", "screen/bubble/8", "screen/bubble/9"],
  },
  {
    key: "screen:simulation",
    area: "screen",
    label: "simulation",
    members: ["screen/simulation/0"],
  },
  {
    key: "screen:archive",
    area: "screen",
    label: "archive",
    members: ["screen/archive/default", "screen/archive/2d/1"],
  },
  {
    key: "screen:archive/attraction-targets",
    area: "screen",
    label: "archive/attraction-targets",
    members: ["screen/archive/attraction-targets/1", "screen/archive/attraction-targets/2", "screen/archive/attraction-targets/3"],
  },
  {
    key: "screen:archive/pillars",
    area: "screen",
    label: "archive/pillars",
    members: [
      "screen/archive/pillars/1",
      "screen/archive/pillars/2",
      "screen/archive/pillars/3",
      "screen/archive/pillars/4",
    ],
  },
  {
    key: "screen:archive/media-grid",
    area: "screen",
    label: "archive/media-grid",
    members: ["screen/archive/media-grid/1"],
  },
  {
    key: "screen:archive/keyword-field",
    area: "screen",
    label: "archive/keyword-field",
    members: ["screen/archive/keyword-field/1", "screen/archive/keyword-field/2"],
  },
  {
    key: "screen:archive/overlay-3d",
    area: "screen",
    label: "archive/overlay-3d",
    members: [
      "screen/archive/overlay-3d/1",
      "screen/archive/overlay-3d/2",
      "screen/archive/overlay-3d/3",
      "screen/archive/overlay-3d/4",
      "screen/archive/overlay-3d/5",
    ],
  },
  {
    key: "screen:archive/overlay-2d",
    area: "screen",
    label: "archive/overlay-2d",
    members: [
      "screen/archive/overlay-2d/1",
      "screen/archive/overlay-2d/2",
      "screen/archive/overlay-2d/3",
      "screen/archive/overlay-2d/4",
    ],
  },
  {
    key: "screen:archive/attention-print",
    area: "screen",
    label: "archive/attention-print",
    members: ["screen/archive/attention-print/1"],
  },
  {
    key: "screen:archive/tech-eyes",
    area: "screen",
    label: "archive/tech-eyes",
    members: [
      "screen/archive/tech-eyes/1",
      "screen/archive/tech-eyes/2",
    ],
  },
  {
    key: "pc:2d-mobiles",
    area: "pc",
    label: "2d-mobiles",
    members: ["pc/2d-mobiles/1", "pc/2d-mobiles/2"],
  },
  {
    key: "pc:3d-mobiles",
    area: "pc",
    label: "3d-mobiles",
    members: ["pc/3d-mobiles/1", "pc/3d-mobiles/2"],
  },
  {
    key: "pc:archive/news-phones",
    area: "pc",
    label: "archive/news-phones",
    members: ["pc/archive/news-phones/1", "pc/archive/news-phones/2"],
  },
  {
    key: "pc:archive/image-search",
    area: "pc",
    label: "archive/image-search",
    members: ["pc/archive/image-search/1"],
  },
  {
    key: "pc:archive/native-windows",
    area: "pc",
    label: "archive/native-windows",
    members: ["pc/archive/native-windows/1", "pc/archive/native-windows/2", "pc/archive/native-windows/3"],
  },
];
