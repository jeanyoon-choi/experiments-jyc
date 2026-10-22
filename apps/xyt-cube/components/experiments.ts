import type { ComponentType } from "react";

export type XytCubeExperiment = {
  key: string;
  legacyKeys?: readonly string[];
  date: string;
  /**
   * ISO date of its latest major revision: behaviour or meaning changed at the
   * user's request (not renames, moves, config, docs or refactors). The
   * navigation orders by it; dated archives keep `date`.
   */
  updated?: string;
  label: string;
  load: () => Promise<{ default: ComponentType }>;
};

export type NavigationExperiment = Pick<XytCubeExperiment, "key" | "date" | "updated" | "label">;

// spacetime/1 is one multi-device variant: one screen plus one mobile link per
// operation (O1 compact, O2 boost, O3 mass). Roles live under components/spacetime/1.
export const xytCubeExperiments: readonly XytCubeExperiment[] = [
  {
    key: "screen/spacetime/1",
    date: "2026-10-19",
    label: "Spacetime cube",
    load: () => import("./spacetime/1/screen"),
  },
  {
    key: "mobile/spacetime/1/compact",
    date: "2026-10-19",
    label: "O1 compact — time circle",
    load: () => import("./spacetime/1/mobile/compact"),
  },
  {
    key: "mobile/spacetime/1/boost",
    date: "2026-10-19",
    label: "O2 boost — observer",
    load: () => import("./spacetime/1/mobile/boost"),
  },
  {
    key: "mobile/spacetime/1/mass",
    date: "2026-10-19",
    label: "O3 mass — clock lag",
    load: () => import("./spacetime/1/mobile/mass"),
  },
  // moving-image/1: Fels, Lee & Mase's video cubism. The screen is a cut plane
  // through the clip's (x, y, t) box; one phone link turns the plane.
  {
    key: "screen/moving-image/1",
    legacyKeys: ["screen/cubism/1"],
    date: "2026-10-20",
    label: "Video cubism — cut plane",
    load: () => import("./moving-image/1/screen"),
  },
  {
    key: "mobile/moving-image/1",
    legacyKeys: ["mobile/cubism/1"],
    date: "2026-10-20",
    label: "Video cubism — the phone is the cut",
    load: () => import("./moving-image/1/mobile"),
  },
  // moving-image/2: the projection stays the flat present; the cube itself is bent
  // by one of six geometries (note Option A). Phones change how much.
  {
    key: "screen/moving-image/2",
    legacyKeys: ["screen/cubism/2"],
    date: "2026-10-20",
    label: "Bent cube — fixed plane",
    load: () => import("./moving-image/2/screen"),
  },
  {
    key: "mobile/moving-image/2",
    legacyKeys: ["mobile/cubism/2"],
    date: "2026-10-20",
    label: "Bent cube — the phone bends",
    load: () => import("./moving-image/2/mobile"),
  },
  // moving-image/3: moving-image/1–2 with a continuous (liquid) volume: no
  // frame steps or pixel seams in any cut. Screen only.
  {
    key: "screen/moving-image/3",
    date: "2026-10-20",
    updated: "2026-10-22",
    label: "Liquid cube — continuous slices",
    load: () => import("./moving-image/3/screen"),
  },
  // moving-image/4: moving-image/3 over fixed-viewpoint time-lapses (a day,
  // a crossing, the Earth, a glacier's decades). Screen only.
  {
    key: "screen/moving-image/4",
    date: "2026-10-22",
    label: "Time-lapse cube",
    load: () => import("./moving-image/4/screen"),
  },
  // clock/1: not recorded footage but a clock defined in (x, y, t), whose cube
  // is turned like moving-image/1. Screen only.
  {
    key: "screen/clock/1",
    date: "2026-10-20",
    label: "Clock cube — turning the axis of time",
    load: () => import("./clock/1/screen"),
  },
  // clock/2: moving-image/2's operation on the clock: the screen stays the
  // flat present; the clock's cube is bent (six geometries, Möbius for flux).
  {
    key: "screen/clock/2",
    date: "2026-10-20",
    label: "Clock cube — bending the cube, keeping the plane",
    load: () => import("./clock/2/screen"),
  },
  // clock/1-3d, clock/2-3d: clock/1's turning cut and clock/2's bending on a
  // hyperreal 3D clock instead of the flat one. Screen only.
  {
    key: "screen/clock/1-3d",
    date: "2026-10-20",
    label: "3D clock cube — turning the axis of time",
    load: () => import("./clock/1-3d/screen"),
  },
  {
    key: "screen/clock/2-3d",
    date: "2026-10-20",
    label: "3D clock cube — bending the cube, keeping the plane",
    load: () => import("./clock/2-3d/screen"),
  },
];

export const xytCubeNavigationExperiments: readonly NavigationExperiment[] =
  xytCubeExperiments.map(({ key, date, updated, label }) => ({ key, date, updated, label }));

export function findXytCubeExperiment(path: readonly string[]) {
  const key = path.join("/");
  return xytCubeExperiments.find(
    (item) => item.key === key || item.legacyKeys?.includes(key),
  );
}
