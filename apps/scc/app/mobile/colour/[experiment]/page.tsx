import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import ColourOne from "@/components/mobile/colour/1";
import ColourTwo from "@/components/mobile/colour/2";

export const metadata: Metadata = { title: "colour" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export default async function ColourPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <ColourOne />;
  if (experiment === "2") return <ColourTwo />;
  notFound();
}
