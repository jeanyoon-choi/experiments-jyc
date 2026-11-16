import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NaverNewsOne from "@/components/mobile/left-right/naver-news/1";

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / left-right / naver-news / ${experiment}` };
}

export default async function MobileLeftRightNaverNewsExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <NaverNewsOne />;
  notFound();
}
