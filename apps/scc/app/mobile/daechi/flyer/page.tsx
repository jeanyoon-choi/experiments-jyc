import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / daechi / flyer",
};

export default function MobileDaechiFlyerIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/daechi/flyer" })}
      scope="mobile/daechi/flyer"
      scopeKey="mobile/daechi/flyer"
    />
  );
}
