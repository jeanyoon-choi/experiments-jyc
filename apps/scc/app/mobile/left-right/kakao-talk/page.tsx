import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / left-right / kakao-talk",
};

export default function MobileLeftRightKakaoTalkIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/left-right/kakao-talk" })}
      scope="mobile/left-right/kakao-talk"
      scopeKey="mobile/left-right/kakao-talk"
    />
  );
}
