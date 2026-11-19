// The deterministic raft the school's digests (school-hash.test.ts) and its
// thread test (school-thread.test.ts) step fish around. Not a test itself.

export const WIDTH = 1200;
export const HEIGHT = 700;

/** A pressed raft of `count` pages after `portions` travelling portions, a page swelling to crush fish now and then. */
export function raft(count: number, time: number, bubbles: Float32Array, portions: number) {
  let at = 0;
  for (let portion = 0; portion < portions; portion += 1) {
    bubbles[at++] = 100 + ((time * 0.2 + portion / portions) % 1) * (WIDTH - 200);
    bubbles[at++] = 120 + portion * 40;
    bubbles[at++] = 6;
    bubbles[at++] = 0.5;
  }
  for (let page = 0; page < count; page += 1) {
    const r = 9 * Math.sqrt(page + 0.5);
    const a = page * 2.39996;
    bubbles[at++] = WIDTH / 2 + Math.cos(a) * r * 1.4 + Math.sin(time * 0.3) * 10;
    bubbles[at++] = HEIGHT / 2 + Math.sin(a) * r;
    bubbles[at++] = page === 3 ? 16 * (1 + 0.8 * Math.sin(time * 2)) : 7 + 10 * (((page * 37) % 10) / 10);
    bubbles[at++] = (page * 0.137) % 1;
  }
  return at / 4;
}
