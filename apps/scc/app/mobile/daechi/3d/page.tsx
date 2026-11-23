import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / daechi / 3d",
};

export default function MobileDaechi3dIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/daechi/3d" })}
      scope="mobile/daechi/3d"
      scopeKey="mobile/daechi/3d"
    />
  );
}
