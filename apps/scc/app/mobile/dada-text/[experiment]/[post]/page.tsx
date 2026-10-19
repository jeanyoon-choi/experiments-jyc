import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dadaTextPosts } from "@/components/mobile/dada-text/experiments";

export function generateStaticParams() {
  return Object.entries(dadaTextPosts).flatMap(([experiment, posts]) => posts.map((post) => ({ experiment, post })));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string; post: string }> }): Promise<Metadata> {
  const { experiment, post } = await params;
  return { title: `mobile / dada-text / ${experiment} / ${post}` };
}

/** The open post is read by the experiment in the layout; this page only admits the ids it knows. */
export default async function DadaTextPostPage({ params }: { params: Promise<{ experiment: string; post: string }> }) {
  const { experiment, post } = await params;
  if (!dadaTextPosts[experiment]?.includes(post)) notFound();
  return null;
}
