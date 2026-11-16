import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / scroll-rot / eye",
};

export default function MobileScrollRotEyeIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/scroll-rot/eye" })}
      scope="mobile/scroll-rot/eye"
      scopeKey="mobile/scroll-rot/eye"
    />
  );
}
