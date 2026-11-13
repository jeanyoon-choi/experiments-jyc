// 인쇄물: what the shader (print.ts), the texture (print-sheets.ts) and the painter's thread (print-worker.ts,
// print-paint.ts) agree on. Nothing here touches the DOM or WebGL, so the worker can import it.

/** A sheet's side in texels. Twelve sheets with their mipmaps hold about 64 MiB of texture, only while 인쇄물 is in use. */
export const SHEET_SIZE = 1024;

/** 방향: three bodies of printed matter, each with the same three kinds of sheet. */
export const PRINT_REGIONS = [
  { value: 0, label: "한국" },
  { value: 1, label: "뉴욕" },
  { value: 2, label: "빅테크" },
] as const;

/** Where each kind's layers lie in a region's texture array: 신문 (uncoated), 잡지 (coated gloss), 전단 (thin gloss). */
export const PRINT_KINDS = {
  newspaper: { first: 0, count: 4 },
  magazine: { first: 4, count: 4 },
  flyer: { first: 8, count: 4 },
} as const;

export const SHEET_COUNT = 12;

/** The texture unit the sheets are bound to (the raft's programs use 0–7, the objects' fields 8–18). */
export const PRINT_UNIT = 19;

export type PaintRequest = { region: number };
export type PaintAnswer = { region: number; layer: number; bitmap: ImageBitmap };
