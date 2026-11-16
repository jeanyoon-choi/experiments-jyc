import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / pool",
};

export default function MobilePoolIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/pool" })}
      scope="mobile/pool"
      scopeKey="mobile/pool"
    />
  );
}
