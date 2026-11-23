import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / south-north / tv-news",
};

export default function MobileSouthNorthTvNewsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/south-north/tv-news" })}
      scope="mobile/south-north/tv-news"
      scopeKey="mobile/south-north/tv-news"
    />
  );
}
