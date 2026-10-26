export const spoonClassExperiments = [
  { slug: "default", label: "spoon-class/default" },
  { slug: "1", label: "spoon-class/1" },
  { slug: "2", label: "spoon-class/2" },
  { slug: "3", label: "spoon-class/3" },
  { slug: "4", label: "spoon-class/4" },
] as const;

export type SpoonClassExperimentSlug =
  (typeof spoonClassExperiments)[number]["slug"];

export function isSpoonClassExperimentSlug(
  value: string,
): value is SpoonClassExperimentSlug {
  return spoonClassExperiments.some((experiment) => experiment.slug === value);
}
