import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import ChristmasTreeOne from "@/components/mobile/christmas-tree/1";
import ChristmasTreeTwo from "@/components/mobile/christmas-tree/2";

export const metadata: Metadata = { title: "mobile / christmas-tree" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export default async function ChristmasTreePage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <ChristmasTreeOne />;
  if (experiment === "2") return <ChristmasTreeTwo />;
  notFound();
}
