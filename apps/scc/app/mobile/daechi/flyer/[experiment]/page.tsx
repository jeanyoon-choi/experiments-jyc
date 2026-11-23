import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import DaechiFlyerOne from "@/components/mobile/daechi/flyer/1";

export const metadata: Metadata = { title: "mobile / daechi / flyer" };
// The flyer is a fixed sheet and may not be zoomed. The browser bar and the
// status bar over it take the yellow of the station strip, 수인분당선's.
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#ffb300", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function DaechiFlyerPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <DaechiFlyerOne />;
  notFound();
}
