import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import BrainOne from "@/components/mobile/scroll-rot/brain/1";
import BrainTwo from "@/components/mobile/scroll-rot/brain/2";

export const metadata: Metadata = { title: "mobile / scroll-rot / brain" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0f0d0d" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export default async function BrainPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <BrainOne />;
  if (experiment === "2") return <BrainTwo />;
  notFound();
}
