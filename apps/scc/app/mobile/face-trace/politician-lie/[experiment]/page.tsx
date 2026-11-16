import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PoliticianLieOne from "@/components/mobile/face-trace/politician-lie/1";

export const metadata: Metadata = { title: "mobile / face-trace / politician-lie" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function PoliticianLiePage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <PoliticianLieOne />;
  notFound();
}
