import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / face-trace / politician-lie",
};

export default function MobileFaceTracePoliticianLieIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/face-trace/politician-lie" })}
      scope="mobile/face-trace/politician-lie"
      scopeKey="mobile/face-trace/politician-lie"
    />
  );
}
