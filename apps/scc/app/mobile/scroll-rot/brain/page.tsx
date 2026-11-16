import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / scroll-rot / brain",
};

export default function MobileScrollRotBrainIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/scroll-rot/brain" })}
      scope="mobile/scroll-rot/brain"
      scopeKey="mobile/scroll-rot/brain"
    />
  );
}
