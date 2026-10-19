/**
 * The representative colour of a picture or a frame of video: the alpha-weighted mean of a
 * 12 × 12 sample. One sample per source; a picture not yet loaded, or cross-origin, is sampled through a CORS copy and the
 * caller is told when its colour is ready.
 */

const SAMPLE = 12;
const colours = new Map<string, string | null>();

/** A fresh canvas each time: one cross-origin draw taints a canvas for good, and the next source could not be read from it. */
function readColour(source: CanvasImageSource) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SAMPLE;
  const sampler = canvas.getContext("2d", { willReadFrequently: true });
  if (!sampler) return null;
  sampler.drawImage(source, 0, 0, SAMPLE, SAMPLE);
  const pixels = sampler.getImageData(0, 0, SAMPLE, SAMPLE).data;
  let red = 0, green = 0, blue = 0, weight = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    red += pixels[index] * alpha;
    green += pixels[index + 1] * alpha;
    blue += pixels[index + 2] * alpha;
    weight += alpha;
  }
  return weight ? `rgb(${Math.round(red / weight)},${Math.round(green / weight)},${Math.round(blue / weight)})` : null;
}

/** The colour of an image or video element's source, or null while it is unknown; `onReady` fires once it is sampled later. */
export function representativeColour(element: HTMLImageElement | HTMLVideoElement, onReady: () => void) {
  const source = element instanceof HTMLImageElement ? element.currentSrc || element.src : element.currentSrc || element.src || element.poster;
  if (!source) return null;
  if (colours.has(source)) return colours.get(source) ?? null;

  const ready = element instanceof HTMLImageElement ? element.complete && element.naturalWidth > 0 : element.readyState >= 2;
  if (ready) {
    try {
      const colour = readColour(element);
      colours.set(source, colour);
      return colour;
    } catch {
      // A cross-origin source taints the sampler; it is read again through a CORS copy below.
    }
  } else if (element instanceof HTMLVideoElement) {
    // A frame arrives with the video; its poster stands in meanwhile.
    if (element.poster && element.poster !== source) {
      const poster = new Image();
      poster.crossOrigin = "anonymous";
      poster.onload = () => { try { colours.set(source, readColour(poster)); } catch { colours.set(source, null); } onReady(); };
      poster.src = element.poster;
    }
    element.addEventListener("loadeddata", () => { colours.delete(source); onReady(); }, { once: true });
    colours.set(source, null);
    return null;
  }

  colours.set(source, null);
  const copy = new Image();
  copy.crossOrigin = "anonymous";
  copy.onload = () => {
    try {
      colours.set(source, readColour(copy));
    } catch {
      colours.set(source, null);
    }
    onReady();
  };
  copy.onerror = () => colours.set(source, null);
  copy.src = source;
  return null;
}
