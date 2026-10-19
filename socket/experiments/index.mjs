import { cValExperiments } from "#socket/c-val";
import { ddongMeongExperiments } from "#socket/ddong-meong";
import { goldfishesExperiments } from "#socket/goldfishes";
import { sixSigmaExperiments } from "#socket/six-sigma";
import { sccExperiments } from "#socket/scc";
import { xytCubeExperiments } from "#socket/xyt-cube";

function validateExperimentRegistry(items) {
  const ids = new Set();
  const eventNames = new Set();

  for (const experiment of items) {
    if (!experiment?.id || typeof experiment.register !== "function") {
      throw new TypeError("Invalid socket experiment registration");
    }
    if (ids.has(experiment.id)) {
      throw new Error(`Duplicate socket experiment id: ${experiment.id}`);
    }
    ids.add(experiment.id);

    for (const eventName of Object.values(experiment.events ?? {})) {
      if (eventNames.has(eventName)) {
        throw new Error(`Duplicate socket event name: ${eventName}`);
      }
      eventNames.add(eventName);
    }
  }

  return Object.freeze([...items]);
}

export const experiments = validateExperimentRegistry([
  ...ddongMeongExperiments,
  ...sccExperiments.slice(0, 5),
  ...cValExperiments,
  ...sccExperiments.slice(5),
  ...goldfishesExperiments,
  ...sixSigmaExperiments,
  ...xytCubeExperiments,
]);

export const experimentRegistries = Object.freeze({
  all: experiments,
  "c-val": validateExperimentRegistry(cValExperiments),
  "ddong-meong": validateExperimentRegistry(ddongMeongExperiments),
  goldfishes: validateExperimentRegistry(goldfishesExperiments),
  "six-sigma": validateExperimentRegistry(sixSigmaExperiments),
  scc: validateExperimentRegistry(sccExperiments),
  "xyt-cube": validateExperimentRegistry(xytCubeExperiments),
});
