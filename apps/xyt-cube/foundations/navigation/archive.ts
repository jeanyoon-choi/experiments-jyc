// Dates are registry data; `/<area>/<MMDD>` archives are derived from them.
export function getXytCubeArchive(item: { key: string; date: string }) {
  return `${item.key.split("/")[0]}/${item.date.slice(5).replace("-", "")}`;
}

/** The date that orders the navigation: the latest major revision, else creation. */
export function getActivity(item: { date: string; updated?: string }) {
  return item.updated ?? item.date;
}
