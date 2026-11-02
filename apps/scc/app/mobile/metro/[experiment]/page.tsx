import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import MetroOne from "@/components/mobile/metro/1";

export const metadata: Metadata = { title: "수도권 전철 노선도" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#ffffff" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function MetroPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <MetroOne />;
  notFound();
}
