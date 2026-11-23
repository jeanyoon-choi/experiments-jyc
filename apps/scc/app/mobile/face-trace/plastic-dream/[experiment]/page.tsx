import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import PlasticDreamOne from "@/components/mobile/face-trace/plastic-dream/1";
import PlasticDreamTwo from "@/components/mobile/face-trace/plastic-dream/2";

export const metadata: Metadata = { title: "mobile / face-trace / plastic-dream" };

type Props = { params: Promise<{ experiment: string }> };

// /2 is a fixed sheet and may not be zoomed; /1 keeps the default.
export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { experiment } = await params;
  const base: Viewport = { viewportFit: "cover", themeColor: "#000000" };
  return experiment === "2" ? { ...base, width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false } : base;
}

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export default async function PlasticDreamPage({ params }: Props) {
  const { experiment } = await params;
  if (experiment === "1") return <PlasticDreamOne />;
  if (experiment === "2") return <PlasticDreamTwo />;
  notFound();
}
