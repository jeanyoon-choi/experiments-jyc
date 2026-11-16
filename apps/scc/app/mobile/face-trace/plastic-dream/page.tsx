import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / face-trace / plastic-dream",
};

export default function MobilePlasticDreamIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/face-trace/plastic-dream" })}
      scope="mobile/face-trace/plastic-dream"
      scopeKey="mobile/face-trace/plastic-dream"
    />
  );
}
