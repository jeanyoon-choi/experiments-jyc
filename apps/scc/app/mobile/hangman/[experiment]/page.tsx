import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import HangmanOne from "@/components/mobile/hangman/1";

export const metadata: Metadata = { title: "Hangman" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#ffffff" };

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function HangmanPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <HangmanOne />;
  notFound();
}
