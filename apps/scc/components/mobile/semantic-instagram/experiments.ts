import type { ComponentType } from "react";
import SemanticInstagramOne from "./1";

/** Each variant owns its clone, filter and panel; the route only picks one. */
export const semanticInstagramExperiments: Record<string, ComponentType> = {
  "1": SemanticInstagramOne,
};
