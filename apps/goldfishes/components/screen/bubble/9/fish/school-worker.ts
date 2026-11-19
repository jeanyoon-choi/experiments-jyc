// The goldfish school's own thread (school-thread.ts): each frame message is
// stepped and sent straight back, its buffers handed over rather than copied.

import { buffersOf, SchoolCore, type SchoolFrame } from "./school-core.ts";

let core: SchoolCore | null = null;

self.onmessage = (event: MessageEvent<SchoolFrame>) => {
  const frame = event.data;
  core ??= new SchoolCore(frame.width, frame.height);
  const answer = core.run(frame);
  (self as unknown as Worker).postMessage(answer, buffersOf(answer));
};
