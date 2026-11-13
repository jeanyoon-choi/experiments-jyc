import { createElement } from "react";
import Goldfishes3D from "./screen";

export default function Goldfishes0804NodeEdge() {
  return createElement(Goldfishes3D, {
    attentionZoneBehavior: "protected-perimeter",
    cameraProjection: "perspective",
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
