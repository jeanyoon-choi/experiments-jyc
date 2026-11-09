import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import PraiseStampOne from "@/components/mobile/praise-stamp/1";

export const metadata: Metadata = { title: "칭찬도장" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#fbf9f3" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function PraiseStampPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <PraiseStampOne />;
  notFound();
}
