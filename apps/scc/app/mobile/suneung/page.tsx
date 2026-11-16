import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / suneung",
};

export default function MobileSuneungIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/suneung" })}
      scope="mobile/suneung"
      scopeKey="mobile/suneung"
    />
  );
}
