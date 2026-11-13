// Copied from SCC mobiles/1 (model/layout.ts), unchanged in method.

export const phoneConfig = {
  /** Outer frame size in pt; the glass inside is 390 × 844. */
  phoneWidth: 404,
  phoneHeight: 858,
  gapRatio: 0.035,
  outerMarginRatio: 0.025,
} as const;

/**
 * Largest uniform phone size whose grid fits the viewport. Rows and columns
 * follow the phone count and the screen's shape: fewer phones means fewer
 * rows and bigger phones. Ties go to the layout with fewer empty seats.
 */
export function fitPhoneGrid(width: number, height: number, count: number) {
  const aspect = phoneConfig.phoneWidth / phoneConfig.phoneHeight;
  const margin = Math.min(width, height) * phoneConfig.outerMarginRatio;
  const availableWidth = Math.max(0, width - margin * 2);
  const availableHeight = Math.max(0, height - margin * 2);
  let best = { columns: 1, rows: 1, width: 0, height: 0, gap: 0 };
  for (let columns = 1; columns <= Math.max(1, count); columns++) {
    const rows = Math.max(1, Math.ceil(count / columns));
    const phoneWidth = Math.min(
      availableWidth / (columns + (columns - 1) * phoneConfig.gapRatio),
      availableHeight / (rows / aspect + (rows - 1) * phoneConfig.gapRatio),
    );
    const empty = columns * rows - count;
    const bestEmpty = best.columns * best.rows - count;
    if (phoneWidth > best.width + 1e-6 || (Math.abs(phoneWidth - best.width) <= 1e-6 && empty < bestEmpty)) {
      best = { columns, rows, width: phoneWidth, height: phoneWidth / aspect, gap: phoneWidth * phoneConfig.gapRatio };
    }
  }
  return best;
}
