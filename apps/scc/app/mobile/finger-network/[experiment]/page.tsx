import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobileFingerNetworkOne from "@/components/mobile/finger-network/1";
import MobileFingerNetworkTwo from "@/components/mobile/finger-network/2";
import MobileFingerNetworkThree from "@/components/mobile/finger-network/3";
import MobileFingerNetworkFour from "@/components/mobile/finger-network/4";
import MobileFingerNetworkFive from "@/components/mobile/finger-network/5";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }, { experiment: "3" }, { experiment: "4" }, { experiment: "5" }];
}

export const metadata: Metadata = { title: "mobile / finger-network" };

export default async function MobileFingerNetworkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <MobileFingerNetworkOne />;
  if (experiment === "2") return <MobileFingerNetworkTwo />;
  if (experiment === "3") return <MobileFingerNetworkThree />;
  if (experiment === "4") return <MobileFingerNetworkFour />;
  if (experiment === "5") return <MobileFingerNetworkFive />;
  notFound();
}
