import type { Metadata } from "next";
import { dadaTextExperiments } from "@/components/mobile/dada-text/experiments";

export function generateStaticParams() {
  return Object.keys(dadaTextExperiments).map((experiment) => ({ experiment }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / dada-text / ${experiment}` };
}

/** The experiment itself is drawn by the layout. */
export default function DadaTextExperimentPage() {
  return null;
}
