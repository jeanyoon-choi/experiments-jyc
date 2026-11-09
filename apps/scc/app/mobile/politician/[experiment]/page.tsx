import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import PoliticianOne from "@/components/mobile/politician/1";
import PoliticianTwo from "@/components/mobile/politician/2";

export const metadata: Metadata = { title: "정치인" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#14161e" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export default async function PoliticianPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <PoliticianOne />;
  if (experiment === "2") return <PoliticianTwo />;
  notFound();
}
