// The counts beside reel n: fictional and fixed.

function hash(n: number) {
  let a = (n + 1) * 0x9e3779b1;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

export function reelOf(n: number) {
  // 800 to 800K, as the counts run in a feed
  const likes = Math.round(800 * Math.pow(1000, hash(n)));
  return {
    likes,
    comments: Math.max(1, Math.round(likes / 64)),
    reposts: Math.max(1, Math.round(likes / 78)),
    shares: Math.max(1, Math.round(likes / 31)),
  };
}

// Instagram's short counts: 749, 2.7K, 36.2K, 823K, 1.2M
export function compactCount(count: number) {
  const [unit, size] = count >= 1e6 ? (["M", 1e6] as const) : count >= 1e3 ? (["K", 1e3] as const) : (["", 1] as const);
  return size === 1 ? String(count) : `${(count / size).toFixed(count / size >= 100 ? 0 : 1).replace(/\.0$/, "")}${unit}`;
}
