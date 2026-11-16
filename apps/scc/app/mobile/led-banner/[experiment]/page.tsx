import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import LedBannerOne from "@/components/mobile/led-banner/1";

export const metadata: Metadata = { title: "전광판" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function LedBannerPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <LedBannerOne />;
  notFound();
}
