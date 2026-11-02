import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / metro",
};

export default function MobileMetroIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/metro" })}
      scope="mobile/metro"
      scopeKey="mobile/metro"
    />
  );
}
