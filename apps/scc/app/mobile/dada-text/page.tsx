import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / dada-text",
};

export default function MobileDadaTextIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/dada-text" })}
      scope="mobile/dada-text"
      scopeKey="mobile/dada-text"
    />
  );
}
