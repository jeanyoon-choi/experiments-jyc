import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / scroll-rot",
};

export default function MobileScrollRotIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/scroll-rot" })}
      scope="mobile/scroll-rot"
      scopeKey="mobile/scroll-rot"
    />
  );
}
