import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import EyeOne from "@/components/mobile/scroll-rot/eye/1";

export const metadata: Metadata = { title: "mobile / scroll-rot / eye" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0f0d0d" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function EyePage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <EyeOne />;
  notFound();
}
