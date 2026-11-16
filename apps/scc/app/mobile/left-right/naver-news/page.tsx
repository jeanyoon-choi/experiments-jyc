import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / left-right / naver-news",
};

export default function MobileLeftRightNaverNewsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/left-right/naver-news" })}
      scope="mobile/left-right/naver-news"
      scopeKey="mobile/left-right/naver-news"
    />
  );
}
