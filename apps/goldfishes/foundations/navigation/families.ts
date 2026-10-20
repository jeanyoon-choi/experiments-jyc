export type GoldfishArea =
  | "screen"
  | "pc"
  | "desktop"
  | "mobile";

export const goldfishAreas: readonly { key: GoldfishArea; href: string }[] = [
  { key: "screen", href: "/screen" },
  { key: "pc", href: "/pc" },
  { key: "desktop", href: "/desktop" },
  { key: "mobile", href: "/mobile" },
];

export type GoldfishFamily = {
  key: string;
  area: GoldfishArea;
  label: string;
  /** Experiment keys in lineage order; each key belongs to one family. */
  members: readonly string[];
};

// Lineages for the group view, in the order each line of work began. A
// registered experiment missing here appears under its area's "unsorted"
// family until it is assigned.
export const goldfishFamilies: readonly GoldfishFamily[] = [
  {
    key: "screen:baseline",
    area: "screen",
    label: "baseline",
    members: ["screen/default", "screen/2d/1"],
  },
  {
    key: "screen:attraction-targets",
    area: "screen",
    label: "attraction targets",
    members: ["screen/attraction-targets/1", "screen/attraction-targets/2", "screen/attraction-targets/3"],
  },
  {
    key: "screen:pillars",
    area: "screen",
    label: "pillars",
    members: [
      "screen/pillars/1",
      "screen/pillars/2",
      "screen/pillars/3",
      "screen/pillars/4",
    ],
  },
  {
    key: "screen:media-grid",
    area: "screen",
    label: "media grid",
    members: ["screen/media-grid/1"],
  },
  {
    key: "screen:keyword-field",
    area: "screen",
    label: "keyword field",
    members: ["screen/keyword-field/1", "screen/keyword-field/2"],
  },
  {
    key: "screen:overlay-3d",
    area: "screen",
    label: "3D overlay",
    members: [
      "screen/overlay-3d/1",
      "screen/overlay-3d/2",
      "screen/overlay-3d/3",
      "screen/overlay-3d/4",
      "screen/overlay-3d/5",
    ],
  },
  {
    key: "screen:overlay-2d",
    area: "screen",
    label: "2D overlay",
    members: [
      "screen/overlay-2d/1",
      "screen/overlay-2d/2",
      "screen/overlay-2d/3",
      "screen/overlay-2d/4",
    ],
  },
  {
    key: "screen:attention-print",
    area: "screen",
    label: "attention print",
    members: ["screen/attention-print/1"],
  },
  {
    key: "screen:tech-eyes",
    area: "screen",
    label: "tech eyes",
    members: [
      "screen/tech-eyes/1",
      "screen/tech-eyes/2",
    ],
  },
  {
    key: "screen:bubble",
    area: "screen",
    label: "bubble",
    members: ["screen/bubble/1", "screen/bubble/2"],
  },
  {
    key: "pc:news-phones",
    area: "pc",
    label: "news phones",
    members: ["pc/news-phones/1", "pc/news-phones/2"],
  },
  {
    key: "pc:image-search",
    area: "pc",
    label: "image search",
    members: ["pc/image-search/1"],
  },
  {
    key: "desktop:native-windows",
    area: "desktop",
    label: "native windows",
    members: ["desktop/native-windows/1", "desktop/native-windows/2", "desktop/native-windows/3"],
  },
  {
    key: "mobile:keyword-grid",
    area: "mobile",
    label: "keyword grid",
    members: ["mobile/keyword-grid/1", "mobile/keyword-grid/2"],
  },
];
