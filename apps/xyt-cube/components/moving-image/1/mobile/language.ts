import { useSyncExternalStore } from "react";

export type MobileLanguage = "ko" | "en";

const subscribe = () => () => {};
const readLanguage = (): MobileLanguage =>
  navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
const serverLanguage = (): MobileLanguage => "en";

/** English until the browser says Korean (C-VAL mobile's rule). */
export function useMobileLanguage() {
  return useSyncExternalStore(subscribe, readLanguage, serverLanguage);
}
