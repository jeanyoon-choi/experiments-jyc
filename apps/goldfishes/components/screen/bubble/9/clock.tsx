// /screen/bubble/9b: bubble/9 itself, opening on the 시계 morph style (MORPH_STYLES[1]) so the two ways of morphing can
// be compared side by side (user, 2026-11-06). No code of its own: every edit to bubble/9 applies here too.

import BubbleNine from "./index";

export default function BubbleNineClock() {
  return <BubbleNine morphStyle={1} />;
}
