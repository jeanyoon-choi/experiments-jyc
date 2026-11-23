import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import TvNewsOne from "@/components/mobile/south-north/tv-news/1";
import TvNewsTwo from "@/components/mobile/south-north/tv-news/2";
import TvNewsThree from "@/components/mobile/south-north/tv-news/3";

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }, { experiment: "3" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / south-north / tv-news / ${experiment}` };
}

export default async function MobileSouthNorthTvNewsExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <TvNewsOne />;
  if (experiment === "2") return <TvNewsTwo />;
  if (experiment === "3") return <TvNewsThree />;
  notFound();
}
