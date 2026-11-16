import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PoliticianLieOne from "@/components/mobile/face-trace/politician-lie/1";
import PoliticianLieTwo from "@/components/mobile/face-trace/politician-lie/2";

export const metadata: Metadata = { title: "mobile / face-trace / politician-lie" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export default async function PoliticianLiePage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <PoliticianLieOne />;
  if (experiment === "2") return <PoliticianLieTwo />;
  notFound();
}
