import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / up-down",
};

export default function MobileUpDownIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/up-down" })}
      scope="mobile/up-down"
      scopeKey="mobile/up-down"
    />
  );
}
