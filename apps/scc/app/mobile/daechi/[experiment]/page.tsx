import { notFound, permanentRedirect } from "next/navigation";

// The street moved to /mobile/daechi/3d; its two old addresses forward there.
export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export default async function DaechiMovedPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1" || experiment === "2") permanentRedirect(`/mobile/daechi/3d/${experiment}`);
  notFound();
}
