export type EyeBlinkRequest = { id: number };
type EyeBlinkHandler = (request: EyeBlinkRequest) => boolean;

/** One screen-local command target; algorithms can address a single story ID. */
export function createEyeBlinkController() {
  const eyes = new Map<number, EyeBlinkHandler>();
  let requestId = 0;
  return {
    register(index: number, handler: EyeBlinkHandler) {
      eyes.set(index, handler);
      return () => { if (eyes.get(index) === handler) eyes.delete(index); };
    },
    blinkEye(index: number) {
      return eyes.get(index)?.({ id: ++requestId }) ?? false;
    },
    blinkAll() {
      const request = { id: ++requestId };
      let started = 0;
      for (const handler of eyes.values()) if (handler(request)) started++;
      return started;
    },
  };
}

export type EyeBlinkController = ReturnType<typeof createEyeBlinkController>;
