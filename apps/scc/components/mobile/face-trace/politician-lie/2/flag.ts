// The 태극 alone, as the 태극기 constructs it (red above, blue below, turned to
// the flag's diagonal) but without the field or the trigrams: a disc that
// fills the square it is drawn on.
const RED = "#cd2e3a";
const BLUE = "#0047a0";

export function drawTaegeuk(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const radius = size / 2;
  context.translate(radius, radius);
  context.rotate(Math.atan2(2, 3));
  context.fillStyle = RED;
  context.beginPath();
  context.arc(0, 0, radius, Math.PI, 0);
  context.fill();
  context.fillStyle = BLUE;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI);
  context.fill();
  context.fillStyle = RED;
  context.beginPath();
  context.arc(-radius / 2, 0, radius / 2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = BLUE;
  context.beginPath();
  context.arc(radius / 2, 0, radius / 2, 0, Math.PI * 2);
  context.fill();
  return canvas;
}
