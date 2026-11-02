import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import DaechiOne from "@/components/mobile/daechi/1";

export const metadata: Metadata = { title: "대치동" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0b0b17" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function DaechiPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <DaechiOne />;
  notFound();
}
