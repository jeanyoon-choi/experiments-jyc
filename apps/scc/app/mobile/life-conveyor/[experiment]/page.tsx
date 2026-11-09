import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import LifeConveyorOne from "@/components/mobile/life-conveyor/1";

export const metadata: Metadata = { title: "Life Conveyor" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function LifeConveyorPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <LifeConveyorOne />;
  notFound();
}
