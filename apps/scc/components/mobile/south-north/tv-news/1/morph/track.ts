// The morph track, measured once offline on the two aligned clips: for every
// video frame the same list of points on each side (Vision face landmarks, the
// silhouette read off a person mask, fixed frame anchors) and one
// triangulation of their mean. Coordinates are fractions of one 608 × 1080
// half of the atlas, origin top-left.

export type MorphTrack = {
  fps: number;
  frames: number;
  points: number;
  /** Frame aspect, width / height. */
  aspect: number;
  triangles: Uint16Array;
  /** Writes [southX, southY, northX, northY] per point for one frame. */
  read(frame: number, into: Float32Array): void;
};

type TrackHeader = {
  fps: number;
  frames: number;
  points: number;
  scale: number;
  width: number;
  height: number;
  triangles: number[];
};

export function decodeTrack(header: TrackHeader, data: ArrayBuffer): MorphTrack {
  const { fps, frames, points, scale } = header;
  const stride = points * 4;
  if (data.byteLength !== frames * stride * 2) throw new Error("Morph track size does not match its header");
  const view = new DataView(data);
  const south = stride / 2;
  return {
    fps,
    frames,
    points,
    aspect: header.width / header.height,
    triangles: Uint16Array.from(header.triangles),
    read(frame, into) {
      const base = Math.min(frames - 1, Math.max(0, frame)) * stride * 2;
      for (let point = 0; point < points; point += 1) {
        const offset = point * 2;
        into[point * 4] = view.getInt16(base + offset * 2, true) / scale;
        into[point * 4 + 1] = view.getInt16(base + (offset + 1) * 2, true) / scale;
        into[point * 4 + 2] = view.getInt16(base + (south + offset) * 2, true) / scale;
        into[point * 4 + 3] = view.getInt16(base + (south + offset + 1) * 2, true) / scale;
      }
    },
  };
}

export async function loadTrack(base: string): Promise<MorphTrack> {
  const [header, data] = await Promise.all([
    fetch(`${base}/track.json`).then((response) => {
      if (!response.ok) throw new Error("Morph track header missing");
      return response.json() as Promise<TrackHeader>;
    }),
    fetch(`${base}/track.bin`).then((response) => {
      if (!response.ok) throw new Error("Morph track missing");
      return response.arrayBuffer();
    }),
  ]);
  return decodeTrack(header, data);
}
