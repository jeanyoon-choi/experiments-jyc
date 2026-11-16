import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import TvNewsOne from "@/components/mobile/up-down/tv-news/1";

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / up-down / tv-news / ${experiment}` };
}

export default async function MobileUpDownTvNewsExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <TvNewsOne />;
  notFound();
}
