// The field's modes, at the bottom left as bubble/7's (user, 2026-10-28):
// 필드 (every phone), 한 대 (one phone, large, driven by the mouse; for
// looking in depth, as bubble/7's 랩 looks at one object) and 손 (the page
// is the phone, as on a phone's browser). In the last two: which owner's
// phone, the keyword its posts are about, the app it opens on.

import { APP_NAMES } from "../apps/icons";
import { APP_IDS } from "../apps/registry";
import type { AppId } from "../apps/types";
import { KEYWORDS } from "../content/keywords";
import type { FieldMode } from "../phone/engine";
import styles from "./mode.module.css";

export type ModeState = { mode: FieldMode; seat: number; keyword: string; app: AppId | "" };

const MODES: readonly { id: FieldMode; label: string }[] = [
  { id: "field", label: "필드" },
  { id: "focus", label: "한 대" },
  { id: "hand", label: "손" },
];

export function ModeControl({ state, onChange }: { state: ModeState; onChange: (next: ModeState) => void }) {
  const one = state.mode !== "field";
  const step = (by: number) => onChange({ ...state, seat: (state.seat + by + 64) % 64 });
  return (
    <div className={styles.modes}>
      {one && (
        <div className={styles.switch} role="group" aria-label="폰">
          <button type="button" aria-label="이전 폰" onClick={() => step(-1)}>
            ◀
          </button>
          <span className={styles.seat}>폰 {state.seat + 1}</span>
          <button type="button" aria-label="다음 폰" onClick={() => step(1)}>
            ▶
          </button>
          <select aria-label="키워드" value={state.keyword} onChange={(event) => onChange({ ...state, keyword: event.target.value })}>
            <option value="">모든 키워드</option>
            {KEYWORDS.map((keyword) => (
              <option key={keyword.id} value={keyword.id}>
                {keyword.label}
              </option>
            ))}
          </select>
          <select aria-label="처음 앱" value={state.app} onChange={(event) => onChange({ ...state, app: event.target.value as AppId | "" })}>
            <option value="">주인의 앱</option>
            {APP_IDS.map((app) => (
              <option key={app} value={app}>
                {APP_NAMES[app]}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles.switch} role="group" aria-label="모드">
        {MODES.map((mode) => (
          <button key={mode.id} type="button" aria-pressed={state.mode === mode.id} onClick={() => onChange({ ...state, mode: mode.id })}>
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
