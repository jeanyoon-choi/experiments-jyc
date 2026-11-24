import { useSyncExternalStore } from "react";

// What a viewer chose for themselves: white or black, Korean or English.
// Kept in this browser, not in the address, because it is not part of the view.

const CHANGE = "goldfishes-system-pref";

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/** A stored choice, or null while nothing is chosen (and on the server). */
export function usePref(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  function set(next: string) {
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // Storage may be unavailable; the choice is then not kept.
    }
    window.dispatchEvent(new Event(CHANGE));
  }
  return [value, set] as const;
}
