// Console log for feed/1 (user, 2026-10-27: "log console"): every status
// change at once, and a summary every 2 s of what went through. Nothing on
// screen changes. `?feedlog=0` silences it.

const SUMMARY_MS = 2_000;

export const FEED_LOG = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("feedlog") !== "0";

export function feedLog(role: string, message: string, ...rest: unknown[]) {
  if (FEED_LOG) console.info(`[feed/1 ${role}] ${message}`, ...rest);
}

/** Counts that are logged and reset every 2 s; `describe` adds the moment's state. */
export function feedCounter<K extends string>(role: string, keys: readonly K[], describe: () => string = () => "") {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  const timer = FEED_LOG
    ? setInterval(() => {
        const parts = keys.map((key) => `${key} ${counts[key]}`).join(", ");
        const extra = describe();
        feedLog(role, `${SUMMARY_MS / 1000}s: ${parts}${extra ? ` | ${extra}` : ""}`);
        for (const key of keys) counts[key] = 0;
      }, SUMMARY_MS)
    : null;
  return {
    add(key: K, value = 1) {
      counts[key] += value;
    },
    stop() {
      if (timer !== null) clearInterval(timer);
    },
  };
}
