import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import PoolOne from "@/components/mobile/pool/1";
import PoolTwo from "@/components/mobile/pool/2";

export const metadata: Metadata = { title: "포켓볼" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export default async function PoolPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <PoolOne />;
  if (experiment === "2") return <PoolTwo />;
  notFound();
}
