import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import PlasticDreamOne from "@/components/mobile/face-trace/plastic-dream/1";

export const metadata: Metadata = { title: "mobile / face-trace / plastic-dream" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function PlasticDreamPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <PlasticDreamOne />;
  notFound();
}
