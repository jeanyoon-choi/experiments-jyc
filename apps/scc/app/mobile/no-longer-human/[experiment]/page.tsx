import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import NoLongerHumanOne from "@/components/mobile/no-longer-human/1";

export const metadata: Metadata = { title: "인간 실격" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#fbf9f4" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function NoLongerHumanPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <NoLongerHumanOne />;
  notFound();
}
