import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KakaoTalkOne from "@/components/mobile/left-right/kakao-talk/1";
import KakaoTalkTwo from "@/components/mobile/left-right/kakao-talk/2";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / left-right / kakao-talk / ${experiment}` };
}

export default async function MobileLeftRightKakaoTalkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <KakaoTalkOne />;
  if (experiment === "2") return <KakaoTalkTwo />;
  notFound();
}
