// The goldfish school's own thread (school-thread.ts): each frame message is
// stepped and sent straight back, its buffers handed over rather than copied.

import { SchoolCore, type SchoolFrame } from "./school-thread.ts";

let core: SchoolCore | null = null;

self.onmessage = (event: MessageEvent<SchoolFrame>) => {
  const frame = event.data;
  core ??= new SchoolCore(frame.width, frame.height);
  const answer = core.run(frame);
  const buffers = [answer.bubbles, answer.shown, answer.coats, answer.linkStart, answer.linkTarget, answer.linkWeight, answer.state, answer.touches, answer.contact].map(
    (array) => array.buffer as ArrayBuffer,
  );
  (self as unknown as Worker).postMessage(answer, buffers);
};
