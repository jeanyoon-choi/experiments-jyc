import { defaultSettings, fieldConfig, type FieldSettings } from "./config";

export function fitPhoneGrid(width: number, height: number, count: number, settings: FieldSettings = defaultSettings) {
  const aspect = fieldConfig.phoneWidth / fieldConfig.phoneHeight;
  const margin = Math.min(width, height) * fieldConfig.outerMarginRatio;
  const availableWidth = Math.max(0, width - margin * 2);
  const availableHeight = Math.max(0, height - margin * 2);
  let best = { columns: 1, width: 0, height: 0, gap: 0 };
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.max(settings.minimumRows, Math.ceil(count / columns));
    const phoneWidth = Math.min(
      availableWidth / (columns + (columns - 1) * settings.gapRatio),
      availableHeight / (rows / aspect + (rows - 1) * settings.gapRatio),
    );
    if (phoneWidth > best.width) {
      best = { columns, width: phoneWidth, height: phoneWidth / aspect, gap: phoneWidth * settings.gapRatio };
    }
  }
  return { ...best, width: best.width * settings.phoneScale, height: best.height * settings.phoneScale };
}
