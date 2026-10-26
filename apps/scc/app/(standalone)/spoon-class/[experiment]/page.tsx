import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SpoonClassDefault from "@/components/standalone/spoon-class/default";
import SpoonClassOne from "@/components/standalone/spoon-class/1";
import SpoonClassTwo from "@/components/standalone/spoon-class/2";
import SpoonClassThree from "@/components/standalone/spoon-class/3";
import SpoonClassFour from "@/components/standalone/spoon-class/4";
import {
  isSpoonClassExperimentSlug,
  spoonClassExperiments,
} from "@/components/standalone/spoon-class/experiments";

export function generateStaticParams() {
  return spoonClassExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `spoon-class ${experiment}`,
    description:
      experiment === "1"
        ? "A responsive field of synchronized Chrome Dino game modules."
        : experiment === "2"
          ? "A synchronized human-life game field with less dense and dense layouts."
          : experiment === "3"
            ? "A mobile stack of full-width synchronized human-life games."
            : experiment === "4"
              ? "Eight human-life runners racing, placed left to right by rank."
          : "The original Chrome Dino source preserved as a standalone experiment.",
  };
}

export default async function SpoonClassExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isSpoonClassExperimentSlug(experiment)) notFound();

  if (experiment === "1") return <SpoonClassOne />;
  if (experiment === "2") return <SpoonClassTwo />;
  if (experiment === "3") return <SpoonClassThree />;
  if (experiment === "4") return <SpoonClassFour />;
  return <SpoonClassDefault />;
}
