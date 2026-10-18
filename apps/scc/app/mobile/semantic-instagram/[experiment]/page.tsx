import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { semanticInstagramExperiments } from "@/components/mobile/semantic-instagram/experiments";

export function generateStaticParams() {
  return Object.keys(semanticInstagramExperiments).map((experiment) => ({ experiment }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / semantic-instagram / ${experiment}` };
}

export default async function SemanticInstagramExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  const Experiment = semanticInstagramExperiments[experiment];
  if (!Experiment) notFound();
  return <Experiment />;
}
