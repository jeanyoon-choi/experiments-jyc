import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / daechi",
};

export default function MobileDaechiIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/daechi" })}
      scope="mobile/daechi"
      scopeKey="mobile/daechi"
    />
  );
}
