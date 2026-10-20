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
  // cubism/1: Fels, Lee & Mase's video cubism. The screen is a cut plane
  // through the clip's (x, y, t) box; one phone link turns the plane.
  {
    key: "screen/cubism/1",
    date: "2026-10-20",
    label: "Video cubism — cut plane",
    load: () => import("./cubism/1/screen"),
  },
  {
    key: "mobile/cubism/1",
    date: "2026-10-20",
    label: "Video cubism — the phone is the cut",
    load: () => import("./cubism/1/mobile"),
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
