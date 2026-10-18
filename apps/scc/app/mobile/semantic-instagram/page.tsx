import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / semantic-instagram",
};

export default function MobileSemanticInstagramIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/semantic-instagram" })}
      scope="mobile/semantic-instagram"
      scopeKey="mobile/semantic-instagram"
    />
  );
}
