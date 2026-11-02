import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import EscalatorOne from "@/components/mobile/escalator/1";

export const metadata: Metadata = { title: "Escalator" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#24231f" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function EscalatorPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <EscalatorOne />;
  notFound();
}
