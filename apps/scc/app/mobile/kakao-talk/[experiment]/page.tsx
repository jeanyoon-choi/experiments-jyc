import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KakaoTalkOne from "@/components/mobile/kakao-talk/1";

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / kakao-talk / ${experiment}` };
}

export default async function MobileKakaoTalkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <KakaoTalkOne />;
  notFound();
}
