import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import SuneungMathMobile from "@/components/mobile/suneung/1";
import SuneungMathLecture from "@/components/mobile/suneung/2";
import SuneungMathSwarm from "@/components/mobile/suneung/3";
import SuneungMathCode from "@/components/mobile/suneung/4";
import SuneungDefault from "@/components/mobile/suneung/default";
import SuneungMath from "@/components/mobile/suneung/math";

const titles: Record<string, string> = {
  default: "2026학년도 대학수학능력시험 문제지 국어 영역",
  math: "2026학년도 대학수학능력시험 문제지 수학 영역",
  "1": "2026학년도 대학수학능력시험 수학 영역",
  "2": "2026학년도 대학수학능력시험 수학 영역 해설",
  "3": "2026학년도 대학수학능력시험 수학 영역",
  "4": "2026학년도 대학수학능력시험 수학 영역",
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#ffffff" };

export function generateStaticParams() {
  return [{ experiment: "default" }, { experiment: "math" }, { experiment: "1" }, { experiment: "2" }, { experiment: "3" }, { experiment: "4" }];
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: titles[experiment] };
}

export default async function SuneungPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "default") return <SuneungDefault />;
  if (experiment === "math") return <SuneungMath />;
  if (experiment === "1") return <SuneungMathMobile />;
  if (experiment === "2") return <SuneungMathLecture />;
  if (experiment === "3") return <SuneungMathSwarm />;
  if (experiment === "4") return <SuneungMathCode />;
  notFound();
}
