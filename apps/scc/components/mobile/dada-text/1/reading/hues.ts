/** The hues of 랜덤: drawn once per element and kept, so a re-read never changes a part's colour. */

const hues = new WeakMap<Element, number>();

export const hueOf = (element: Element) => {
  let hue = hues.get(element);
  if (hue === undefined) hues.set(element, (hue = Math.random() * 360));
  return hue;
};

/** A text part's hue: its block's hue turned by the golden angle per token, so the parts of one line differ from one another. */
export const tokenHue = (element: Element, index: number) => (hueOf(element) + index * 137.508) % 360;

export const hsl = (hue: number) => `hsl(${Math.round(hue)} 100% 50%)`;
