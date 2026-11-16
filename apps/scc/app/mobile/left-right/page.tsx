import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / left-right",
};

export default function MobileLeftRightIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/left-right" })}
      scope="mobile/left-right"
      scopeKey="mobile/left-right"
    />
  );
}
