import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / up-down / tv-news",
};

export default function MobileUpDownTvNewsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/up-down/tv-news" })}
      scope="mobile/up-down/tv-news"
      scopeKey="mobile/up-down/tv-news"
    />
  );
}
