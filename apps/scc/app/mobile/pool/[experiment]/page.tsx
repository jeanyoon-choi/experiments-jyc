import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import PoolOne from "@/components/mobile/pool/1";

export const metadata: Metadata = { title: "포켓볼" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function PoolPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <PoolOne />;
  notFound();
}
