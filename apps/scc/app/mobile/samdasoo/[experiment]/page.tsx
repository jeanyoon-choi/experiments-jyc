import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import SamdasooOne from "@/components/mobile/samdasoo/1";

export const metadata: Metadata = { title: "삼다수" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#f6f8f9" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function SamdasooPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <SamdasooOne />;
  notFound();
}
