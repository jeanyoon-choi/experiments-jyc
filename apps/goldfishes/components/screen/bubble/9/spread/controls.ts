// 전파's tables for the panel: the routes and their labels, the sliders, and the values it opens with. Beside the
// simulation (contagion.ts), which knows nothing of the objects: the opening unit, SNS, is the only thing here that
// does.

import { groupBit } from "../objects/kinds/parameters.ts";
import type { SpreadParameters } from "./contagion.ts";

export const SPREAD_ROUTES = ["contact", "links", "both"] as const;
export const SPREAD_ROUTE_LABELS: Record<(typeof SPREAD_ROUTES)[number], string> = { contact: "맞닿음", links: "링크", both: "둘 다" };

// Measured at 0.6 and 2.5 s (2026-10-27): the whole raft in 20 s; now a hop takes several seconds.
// Every page catching it fades again after 20 s on average (user, 2026-11-04); bubble/7 kept it for ever.
export const SPREAD_DEFAULTS: SpreadParameters = { rate: 0.1, takeOn: 3.5, keep: 20, strain: 0, pick: "heart", unit: groupBit("sns"), route: 0, shape: 1 };

export type SpreadControl = { key: "rate" | "takeOn" | "keep"; label: string; min: number; max: number; step: number };

export const SPREAD_CONTROLS: readonly SpreadControl[] = [
  { key: "rate", label: "전염률 (이웃 하나당 초당)", min: 0, max: 3, step: 0.01 },
  { key: "takeOn", label: "물드는 시간 (초)", min: 0.2, max: 10, step: 0.1 },
  { key: "keep", label: "유지 시간 (초, 0 영원히)", min: 0, max: 120, step: 1 },
];
