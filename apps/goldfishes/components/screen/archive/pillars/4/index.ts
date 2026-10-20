import { createElement } from "react";
import Goldfishes3D from "./screen";
import { TEMPORAL_DECAY_RENDERER_REVISION } from "./rendering/goldfish-scene";

export default function Goldfishes0806TemporalDecay() {
  return createElement(Goldfishes3D, {
    attentionZoneBehavior: "protected-perimeter",
    cameraProjection: "orthographic",
    rendererRevision: TEMPORAL_DECAY_RENDERER_REVISION,
    initialAgentScale: 2,
    minimumAgentScale: 1,
    maximumAgentScale: 4,
    initialCount: 100,
    minimumCount: 0,
    maximumCount: 250,
    fishModelStyle: "naturalistic",
    initialFishColor: "#cf741c",
    allowFishModelToggle: true,
  });
}
