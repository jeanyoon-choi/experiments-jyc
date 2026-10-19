import type { Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { dadaTextExperiments } from "@/components/mobile/dada-text/experiments";

/** /1 is black throughout, so the phone's status-bar area (the notch) is black too. */
export async function generateViewport({ params }: { params: Promise<{ experiment: string }> }): Promise<Viewport> {
  const { experiment } = await params;
  return experiment === "1" ? { themeColor: "#000", colorScheme: "dark" } : {};
}

/** The experiment lives in the layout so it stays mounted while its own sub-routes (`[post]`) change under it. */
export default async function DadaTextExperimentLayout({ children, params }: { children: ReactNode; params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  const Experiment = dadaTextExperiments[experiment];
  if (!Experiment) notFound();
  return (
    <>
      <Experiment />
      {children}
    </>
  );
}
