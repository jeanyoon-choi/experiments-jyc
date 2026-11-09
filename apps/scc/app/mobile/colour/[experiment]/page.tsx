import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import ColourOne from "@/components/mobile/colour/1";

export const metadata: Metadata = { title: "colour" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function ColourPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <ColourOne />;
  notFound();
}
