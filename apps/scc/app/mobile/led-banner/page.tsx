import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / led-banner",
};

export default function MobileLedBannerIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/led-banner" })}
      scope="mobile/led-banner"
      scopeKey="mobile/led-banner"
    />
  );
}
