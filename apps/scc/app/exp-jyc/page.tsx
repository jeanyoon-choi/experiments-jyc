import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

// Served as `/` on exp-jyc.vercel.app through the host rewrite in next.config.ts.
export const metadata: Metadata = {
  title: "Experiments — Jeanyoon Choi",
  description: "Experiments by Jeanyoon Choi.",
};

export default function ExpJycIndexPage() {
  return (
    <SccNavigation experiments={getSccNavigationItems()} />
  );
}
