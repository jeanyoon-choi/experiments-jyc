/** Boxes and nearness: where an element is, in which pixels, and whether it is near enough the screen to be read. */

/** The size of an element's border box in its own CSS pixels (unscaled by transforms on it or its ancestors). */
export const boxSize = (element: Element) => element instanceof HTMLElement
  ? { width: element.offsetWidth, height: element.offsetHeight }
  : { width: element.clientWidth || element.getBoundingClientRect().width, height: element.clientHeight || element.getBoundingClientRect().height };

/** Corner radius in px of a box, from its computed top-left radius (px or %). The hiding never changes radii. */
export const radiusOf = (style: CSSStyleDeclaration, width: number) => {
  const value = style.borderTopLeftRadius.split(" ")[0];
  return value.endsWith("%") ? (parseFloat(value) / 100) * width : parseFloat(value) || 0;
};

/** Whether a box lies within a screen of the viewport (half a screen sideways): only there are cells written. */
export function nearRect(rect: DOMRect) {
  const marginY = window.innerHeight;
  const marginX = window.innerWidth * 0.5;
  return rect.bottom > -marginY && rect.top < window.innerHeight + marginY && rect.right > -marginX && rect.left < window.innerWidth + marginX;
}

/** Whether an element is within a screen of view. */
export const near = (element: Element) => nearRect(element.getBoundingClientRect());

/**
 * A subtree to skip: a box no taller than three screens (a post, a row) lying wholly away from the screen.
 * Its contents are read once it comes near. Taller boxes (the feed itself) are entered, since what they hold is spread out.
 */
export function remote(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.height <= window.innerHeight * 3 && rect.width > 0 && !nearRect(rect);
}

/** How far letters keep from the edge of a box whose corners are rounded by `radius`: clear of the curve at the letters' corners. */
export function roundedInset(radius: number, width: number, height: number) {
  const r = Math.min(radius, width / 2, height / 2);
  return r * (1 - Math.SQRT1_2);
}
