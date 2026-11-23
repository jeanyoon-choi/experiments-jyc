import assert from 'node:assert/strict';
import { ApproachEvents } from './approach-events.ts';

const detector = new ApproachEvents();
const fish = [{ id: 0, target: 0, x: 100, y: 0, vx: -20, vy: 0 }];
const relations = { cellCount: 1, centers: new Float64Array([0, 0]), radii: new Float64Array([25]) };
let events = 0;
const emit = () => events++;
detector.step(fish, relations, 0, emit);
fish[0].x = 48; detector.step(fish, relations, 1, emit);
assert.equal(events, 1);
fish[0].x = 50; detector.step(fish, relations, 2, emit);
fish[0].x = 48; detector.step(fish, relations, 3, emit);
assert.equal(events, 1, 'boundary jitter does not retrigger');
fish[0].x = 55; detector.step(fish, relations, 4, emit);
fish[0].x = 48; detector.step(fish, relations, 5, emit);
assert.equal(events, 2);
relations.radii[0] = 0; detector.step(fish, relations, 6, emit);
assert.equal(events, 2);
relations.radii[0] = 25;
detector.reset(); detector.step(fish, relations, 7, emit);
assert.equal(events, 2, 'initial occupied cells are silent');
for (let frame = 0; frame < 7200 * 24; frame++) {
  fish[0].x = frame % 48 < 24 ? 60 : 48;
  detector.step(fish, relations, 8 + frame / 24, emit);
}
assert.equal(events, 3602, 'two hours retain stable entry counts');
console.log('Approach events: entry, jitter, re-entry, expiry, priming, two-hour synthetic run passed.');
