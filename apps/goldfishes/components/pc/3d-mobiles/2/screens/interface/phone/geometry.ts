// The glass in pt and where the system puts things on it — shared by the
// painters (worker) and the phones (main thread), so a thumb lands on the
// icon the home screen drew.

import type { AppId } from "../apps/types";
import type { Os } from "../paint/types";

export const GLASS = { w: 390, h: 844 } as const;
/** The bezel around the glass, pt. */
export const BEZEL = 7;
export const GLASS_RADIUS: Record<Os, number> = { ios: 55, android: 46 };
export const STATUS: Record<Os, number> = { ios: 54, android: 40 };
/** The home indicator's band at the bottom. */
export const HOME_BAR = 34;

export const BANNER = { x: 8, w: 374, y: 56 } as const;

export const HOME_GRID = { columns: 4, icon: 62, left: 26, top: 76, row: 100 } as const;
export const DOCK = { y: GLASS.h - 112, h: 92, inset: 14 } as const;

/** Top-left of the n-th home-screen icon (row by row). */
export function iconAt(index: number) {
  const gap = (GLASS.w - HOME_GRID.left * 2 - HOME_GRID.icon * HOME_GRID.columns) / (HOME_GRID.columns - 1);
  const column = index % HOME_GRID.columns;
  const row = Math.floor(index / HOME_GRID.columns);
  return { x: HOME_GRID.left + column * (HOME_GRID.icon + gap), y: HOME_GRID.top + row * HOME_GRID.row, size: HOME_GRID.icon };
}

/** Top-left of the n-th dock icon. */
export function dockAt(index: number) {
  const { x } = iconAt(index);
  return { x, y: DOCK.y + (DOCK.h - HOME_GRID.icon) / 2, size: HOME_GRID.icon };
}

/** Icons on the home grid (the rest of an owner's apps sit in the dock). */
export const HOME_SLOTS = 20;

const ALL_APPS: readonly AppId[] = ["instagram", "reels", "tiktok", "x", "facebook", "linkedin", "tinder", "yelp", "netflix", "news", "stocks", "shop", "messages"];

/** An owner's home screen: its four most used apps in the dock, every other app on the grid (its own first). */
export function homeLayout(apps: readonly AppId[]) {
  const dock = apps.slice(0, 4);
  const grid = [...apps.slice(4), ...ALL_APPS.filter((app) => !apps.includes(app))];
  return { grid, dock };
}

/** Top-left of an app's icon on its owner's home screen. */
export function homeIcon(apps: readonly AppId[], app: AppId) {
  const { grid, dock } = homeLayout(apps);
  const inDock = dock.indexOf(app);
  return inDock >= 0 ? dockAt(inDock) : iconAt(Math.max(0, grid.indexOf(app)));
}
