import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExpressionOne from "@/components/mobile/expression/1";
import ExpressionTwo from "@/components/mobile/expression/2";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / expression / ${experiment}` };
}

export default async function MobileExpressionExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <ExpressionOne />;
  if (experiment === "2") return <ExpressionTwo />;
  notFound();
}
