// Goldfishes' Socket.IO experiments. Each protocol version is a whole folder
// of its own (feed/1, feed/2, …) with its own prefix, room and state.
import { feedExperiment as feedOne } from "./feed/1/index.mjs";

export const goldfishesExperiments = Object.freeze([feedOne]);
