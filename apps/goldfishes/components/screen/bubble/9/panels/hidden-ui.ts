// X hides every control on the screen (the mode switch, the panels and their triggers) and X again brings them back
// (user, 2026-11-07), for a clean view of the raft. By the key's position (KeyX), so it works under a Korean layout
// too; not while typing into a field, nor with a modifier held.

import { useEffect, useState } from "react";

/** Fields X is typed into (a slider or checkbox in focus still lets X through). */
const TEXT_FIELDS = "textarea, select, input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=color])";

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || target.closest(TEXT_FIELDS) !== null);

/** Whether the controls are hidden, toggled by the X key. */
export function useHiddenUi() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyX" || event.repeat || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      setHidden((current) => !current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return hidden;
}
