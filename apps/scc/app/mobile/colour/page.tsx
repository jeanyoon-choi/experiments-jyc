import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / colour",
};

export default function MobileColourIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/colour" })}
      scope="mobile/colour"
      scopeKey="mobile/colour"
    />
  );
}
