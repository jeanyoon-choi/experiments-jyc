import type { ComponentType } from "react";
import DadaTextDefault from "./default";
import DadaTextOne from "./1";
import { initialPosts } from "./1/instagram/model/data";

/** Each variant owns its clone, filter and panel; the route only picks one. */
export const dadaTextExperiments: Record<string, ComponentType> = {
  default: DadaTextDefault,
  "1": DadaTextOne,
};

/** Variants whose posts open on their own route (`[experiment]/[post]`), with the post ids each one accepts. */
export const dadaTextPosts: Record<string, readonly string[]> = {
  "1": initialPosts.map((post) => post.id),
};
