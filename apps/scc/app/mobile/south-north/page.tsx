import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / south-north",
};

export default function MobileSouthNorthIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/south-north" })}
      scope="mobile/south-north"
      scopeKey="mobile/south-north"
    />
  );
}
