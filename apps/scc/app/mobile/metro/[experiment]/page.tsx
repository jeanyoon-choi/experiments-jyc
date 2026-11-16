import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import MetroOne from "@/components/mobile/metro/1";
import MetroTwo from "@/components/mobile/metro/2";
import MetroThree from "@/components/mobile/metro/3";

export const metadata: Metadata = { title: "수도권 전철 노선도" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#ffffff" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }, { experiment: "3" }];
}

export default async function MetroPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <MetroOne />;
  if (experiment === "2") return <MetroTwo />;
  if (experiment === "3") return <MetroThree />;
  notFound();
}
