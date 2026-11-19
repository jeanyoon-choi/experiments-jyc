// /screen/bubble/9b: bubble/9 itself, opening on preset A3 (presets/families.ts: the 시계 morph style; it was 셋업 C) so the two
// ways of morphing can be compared side by side (user, 2026-11-06). No code of its own: every edit to bubble/9 applies here too.

import BubbleNine from "./index";

export default function BubbleNineClock() {
  return <BubbleNine setup={2} />;
}
